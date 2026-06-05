import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchHistoryForDetail,
  syncHistoryToLocal,
  isNetworkUnavailableError,
  joinProjectWithCode,
} from "../services/dataService";
import { db } from "../services/db_local";
import {
  createPendingReportPayload,
  getPendingReports,
  savePendingReport,
  syncPendingReports,
} from "../services/offlineSyncService";
import { saveReportOnline } from "../repositories/reports.repository";
import { Step, ToastState, ConfirmModalState } from "../features/reportFlow/types";
import { isPuestaTierra, parseOhmsValue } from "../utils/activity";

import { useSessionFlow } from "./flow/useSessionFlow";
import type { SessionUser } from "./flow/useSessionFlow";
import { usePasswordRecoveryFlow } from "./flow/usePasswordRecoveryFlow";
import { useCatalogFlow } from "./flow/useCatalogFlow";
import { useEvidenceFlow } from "./flow/useEvidenceFlow";
import { useRecordsFlow } from "./flow/useRecordsFlow";
import { useMapFlow } from "./flow/useMapFlow";

const MASTER_BUCKET = "user-assets";
const MAX_EVIDENCE_IMAGES = 5;
const sanitizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase();

export function useReportFlow() {
  const [step, setStep] = useState<Step>("auth");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [projectAccessCode, setProjectAccessCode] = useState("");
  const [isJoiningProject, setIsJoiningProject] = useState(false);

  const [previousRecord, setPreviousRecord] = useState<any>(null);

  const showToast = (msg: string, type: 'success'|'error'|'info' = 'success') => {
      setToast({ msg, type }); setTimeout(() => setToast(null), 3500);
  };

  const session = useSessionFlow(showToast, setConfirmModal);
  const recovery = usePasswordRecoveryFlow(showToast);
  const catalog = useCatalogFlow(session.isOnline);
  const evidence = useEvidenceFlow(showToast, catalog.selectedActivity, session.isOnline);
  const records = useRecordsFlow(session.sessionUser?.id, showToast, setConfirmModal, session.setIsLoading, MASTER_BUCKET);
  const { isOnline, sessionUser, hasResolvedInitialSession } = session;
  const { loadProfileData } = session;
  const { loadUserRecords } = records;
  const {
    isRecoveryContextActive,
    hasResolvedInitialCheck,
  } = recovery;
  const map = useMapFlow({
    isActive: step === "map",
    isOnline,
    sessionUserId: sessionUser?.id,
    projects: catalog.projects,
    activities: catalog.activities,
    userRecords: records.userRecords,
    isLoadingUserRecords: records.isLoadingRecords,
    loadUserRecords,
    showToast,
  });

  const syncStatus = isOnline ? "ONLINE" : "OFFLINE";
  const [cachedHistoryDetailIds, setCachedHistoryDetailIds] = useState<number[]>([]);

  useEffect(() => {
    const checkPreviousRecord = async () => {
      if (!catalog.selectedDetail || !isOnline) {
        setPreviousRecord(null);
        return;
      }
      try {
        const record = await fetchHistoryForDetail(catalog.selectedDetail.ID_DetallesActividad);
        setPreviousRecord(record);
      } catch (err) {
        console.error("Error consultando registro previo:", err);
        setPreviousRecord(null);
      }
    };
    checkPreviousRecord();
  }, [catalog.selectedDetail, isOnline]);

  const isAlreadyRegistered = !!previousRecord;
  const loadCachedHistoryDetailIds = useCallback(async () => {
    try {
      const cachedRecords = await db.history_cache.toArray();
      const detailIds = Array.from(
        new Set(
          cachedRecords
            .map((record) => record.id_detalle)
            .filter((detailId) => Number.isFinite(detailId) && detailId > 0)
        )
      );
      setCachedHistoryDetailIds(detailIds);
    } catch (error) {
      console.error("Error leyendo history_cache:", error);
      setCachedHistoryDetailIds([]);
    }
  }, []);

  useEffect(() => {
    if (!sessionUser) {
      setCachedHistoryDetailIds([]);
    }
  }, [sessionUser]);

  const historyDetailIdSet = records.hasLoadedUserRecords
    ? new Set(
        records.userRecords
          .map((record) => record.id_detalle)
          .filter((detailId): detailId is number => Number.isFinite(detailId))
      )
    : new Set(cachedHistoryDetailIds);

  const groupsWithPreviousRecords = new Set<string>();
  const activitiesWithPreviousRecords = new Set<number>();
  catalog.detailsForCurrentStructure.forEach((detail) => {
    if (!historyDetailIdSet.has(detail.ID_DetallesActividad)) return;

    activitiesWithPreviousRecords.add(detail.ID_Actividad);
    if (detail.activityGroup) {
      groupsWithPreviousRecords.add(detail.activityGroup);
    }
  });

  const syncPendingUploads = useCallback(async () => {
      try {
          if (!sessionUser || !isOnline) {
              if (sessionUser && !isOnline) {
                  console.info("[SYNC] Pendientes no procesados; conectividad real no disponible");
              }
              return;
          }
          const pendingReports = await getPendingReports();
          const count = pendingReports.length;
          if(count > 0) {
              showToast(`Subiendo ${count} pendientes...`, "info");
              await syncPendingReports(pendingReports, MASTER_BUCKET);
              await loadUserRecords();
              showToast("Sincronización finalizada", "success");
          }
      } catch (e) { console.error("[SYNC FATAL]", e); }
  }, [isOnline, loadUserRecords, sessionUser]);

  useEffect(() => {
      if (isOnline) syncPendingUploads();
  }, [isOnline, syncPendingUploads]);

  const bootstrappedSessionUserIdRef = useRef<string | null>(null);
  const bootstrapInFlightRef = useRef<Promise<void> | null>(null);

  const runCatalogSyncInBackground = useCallback(
    async (user: SessionUser, options: { showStartToast?: boolean } = {}) => {
      if (!isOnline) return;

      if (!catalog.shouldRunAutomaticCatalogSync()) {
        console.info("[AUTH FLOW] Sync de catalogo omitida por frecuencia reciente", { userId: user.id });
        return;
      }

      try {
        if (options.showStartToast) {
          showToast("Sincronizando en segundo plano...", "info");
        }

        const syncResult = await catalog.performScopedSync();

        if (syncResult === "success") {
          await catalog.loadProjectsLocal();
          await syncHistoryToLocal(user.id);
          await loadCachedHistoryDetailIds();
          await syncPendingUploads();
          showToast("Datos actualizados", "success");
          return;
        }

        showToast("Usando datos locales", "info");
      } catch (error) {
        console.error("[AUTH FLOW] Sync de catalogo en segundo plano fallo; cache preservada", error);
        showToast("Usando datos locales", "info");
      }
    },
    [catalog, isOnline, loadCachedHistoryDetailIds, syncPendingUploads]
  );

  const bootstrapAuthenticatedUser = useCallback(async (user: SessionUser, origin: string) => {
    if (bootstrappedSessionUserIdRef.current === user.id) {
      console.info("[AUTH FLOW] Bootstrap omitido: usuario ya inicializado", { origin, userId: user.id });
      return;
    }

    if (bootstrapInFlightRef.current) {
      console.info("[AUTH FLOW] Esperando bootstrap en curso", { origin, userId: user.id });
      await bootstrapInFlightRef.current;
      return;
    }

    const runBootstrap = async () => {
      console.info("[AUTH FLOW] Iniciando bootstrap autenticado", {
        origin,
        userId: user.id,
        isOnline,
        isRecoveryContextActive,
      });

      session.setIsLoading(true);
      session.setAuthLoadingLabel(isOnline ? "CARGANDO DATOS LOCALES..." : "RESTAURANDO SESION...");

      try {
        const localCatalog = await catalog.loadProjectsLocal();
        await loadCachedHistoryDetailIds();
        const hasLocalCache = localCatalog.projects.length > 0;

        if (hasLocalCache) {
          bootstrappedSessionUserIdRef.current = user.id;
          setStep("project");
          showToast("Datos locales cargados", "success");

          if (isOnline) {
            void loadUserRecords();
            void runCatalogSyncInBackground(user, { showStartToast: true });
          }

          console.info("[AUTH FLOW] Entrada completada con cache local", {
            origin,
            userId: user.id,
            projects: localCatalog.projects.length,
          });
          return;
        }

        if (!isOnline) {
          session.setAuthMessage({
            type: "error",
            text: "No hay datos locales disponibles. Conéctate una vez para sincronizar.",
          });
          showToast("No hay datos locales disponibles. Conéctate una vez para sincronizar.", "error");
          return;
        }

        session.setAuthLoadingLabel("SINCRONIZANDO DATOS...");
        const syncStatus = await catalog.performScopedSync();

        if (syncStatus !== "success") {
          session.setAuthMessage({
            type: "error",
            text: "No se pudo sincronizar el catálogo inicial. Intenta nuevamente.",
          });
          showToast("No se pudo sincronizar el catálogo inicial. Intenta nuevamente.", "error");
          return;
        }

        await catalog.loadProjectsLocal();
        await syncHistoryToLocal(user.id);
        await loadCachedHistoryDetailIds();
        await syncPendingUploads();
        bootstrappedSessionUserIdRef.current = user.id;
        setStep("project");
        void loadUserRecords();
        showToast("Datos actualizados", "success");
      } catch (error) {
        console.error("[AUTH FLOW] Bootstrap autenticado fallo; usando cache local si existe", error);
        try {
          const localCatalog = await catalog.loadProjectsLocal();
          if (localCatalog.projects.length === 0) {
            throw new Error("No local catalog cache available");
          }
          await loadCachedHistoryDetailIds();
          bootstrappedSessionUserIdRef.current = user.id;
          setStep("project");
          showToast(
            isOnline
              ? "Se restauró la sesión con datos locales tras un fallo de sincronización."
              : "Sesión restaurada con datos locales sin conexión.",
            "info"
          );
        } catch (localError) {
          console.error("[AUTH FLOW] Tampoco se pudo restaurar la cache local", localError);
          session.setAuthMessage({
            type: "error",
            text: "No se pudo cargar la información necesaria para ingresar. Intenta nuevamente.",
          });
          showToast("No se pudo cargar la información necesaria para ingresar. Intenta nuevamente.", "error");
        }
      } finally {
        session.setAuthLoadingLabel("AUTENTICANDO...");
        session.setIsLoading(false);
        bootstrapInFlightRef.current = null;
      }
    };

    bootstrapInFlightRef.current = runBootstrap();
    await bootstrapInFlightRef.current;
  }, [
    catalog,
    isOnline,
    isRecoveryContextActive,
    loadCachedHistoryDetailIds,
    loadUserRecords,
    runCatalogSyncInBackground,
    session,
    syncPendingUploads,
  ]);

  useEffect(() => {
    if (!hasResolvedInitialCheck || !hasResolvedInitialSession) {
      return;
    }

    if (isRecoveryContextActive) {
      if (step !== "auth") {
        console.info("[AUTH FLOW] Recovery tiene prioridad; manteniendo vista auth", { previousStep: step });
        setStep("auth");
      }
      return;
    }

    if (!sessionUser) {
      bootstrappedSessionUserIdRef.current = null;
      return;
    }

    void bootstrapAuthenticatedUser(sessionUser, "session-restore");
  }, [
    bootstrapAuthenticatedUser,
    hasResolvedInitialCheck,
    hasResolvedInitialSession,
    isRecoveryContextActive,
    sessionUser,
    step,
  ]);

  useEffect(() => {
    if (!hasResolvedInitialCheck || !hasResolvedInitialSession || isRecoveryContextActive) {
      return;
    }

    if (!sessionUser && step !== "auth") {
      console.info("[AUTH FLOW] No hay sesion activa; regresando a auth", { previousStep: step });
      setStep("auth");
    }
  }, [
    hasResolvedInitialCheck,
    hasResolvedInitialSession,
    isRecoveryContextActive,
    sessionUser,
    step,
  ]);

  const previousStepRef = useRef<Step | null>(null);
  useEffect(() => {
    const previousStep = previousStepRef.current;
    previousStepRef.current = step;

    if (!sessionUser || previousStep === step) {
      return;
    }

    if (step === "profile") {
      void loadProfileData();
      return;
    }

    if (step === "user_records" || step === "files") {
      void loadUserRecords();
    }
  }, [loadProfileData, loadUserRecords, sessionUser, step]);

  const handleGoHome = () => {
      catalog.resetSelection();
      evidence.resetEvidence();
      setStep("project");
      setIsMenuOpen(false);
  };

  const handleJoinProjectWithCode = useCallback(async () => {
    const normalizedCode = projectAccessCode.trim();

    if (!/^\d{8}$/.test(normalizedCode)) {
      showToast("Código inválido. Verifique los 8 dígitos", "error");
      return;
    }

    setIsJoiningProject(true);

    let shouldRefreshProjects = false;

    try {
      const result = await joinProjectWithCode(normalizedCode);

      if (result.status === "invalid_code") {
        showToast("Código inválido. Verifique los 8 dígitos", "error");
        return;
      }

      if (result.status === "not_authenticated") {
        showToast("Sesión inválida. Inicie sesión nuevamente", "error");
        return;
      }

      if (result.status === "already_joined") {
        showToast("Este proyecto ya está en tu cuenta", "info");
      }

      if (result.status === "joined") {
        showToast(`Proyecto '${result.projectName || normalizedCode}' agregado`, "success");
      }

      shouldRefreshProjects = true;
      const syncStatus = await catalog.performScopedSync();
      await catalog.loadProjectsLocal();

      if (result.status === "joined") {
        setProjectAccessCode("");
      }

      if (syncStatus !== "success") {
        showToast("El proyecto fue agregado, pero no se pudo refrescar la lista en este momento.", "info");
      }
    } catch (error) {
      console.error("[PROJECT ACCESS] Error agregando proyecto por código", error);
      if (shouldRefreshProjects) {
        await catalog.loadProjectsLocal();
        showToast("El proyecto fue agregado, pero no se pudo refrescar la lista en este momento.", "info");
      } else {
        showToast("No se pudo agregar el proyecto en este momento.", "error");
      }
    } finally {
      setIsJoiningProject(false);
    }
  }, [catalog, projectAccessCode]);

  const saveReport = async () => {
    if (evidence.evidenceFiles.length === 0 || !session.sessionUser || !catalog.selectedDetail) return showToast("Faltan datos", "error");
    if (evidence.evidenceFiles.length > MAX_EVIDENCE_IMAGES) return showToast("Maximo 5 imagenes", "error");

    const isPatActivity = isPuestaTierra(catalog.selectedActivity);
    const parsedOhms = parseOhmsValue(evidence.ohms);
    if (isPatActivity && parsedOhms === null) {
      showToast("Ingrese una medicion Ohms valida para PAT", "error");
      return;
    }
    if (isPatActivity && parsedOhms !== null && parsedOhms < 0) {
      showToast("La medicion Ohms debe ser mayor o igual a 0", "error");
      return;
    }

    session.setIsLoading(true);
    const timestamp = Date.now();

    const currentProject = catalog.projects.find(p => p.ID_Proyectos === catalog.selectedProjectId);
    const currentFront = catalog.fronts.find(f => f.ID_Frente === catalog.selectedFrontId);
    const currentLocality = catalog.localities.find(l => l.ID_Localidad === catalog.selectedLocalityId);

    const folderProject = sanitizeName(currentProject?.Proyecto_Nombre || "General");
    const folderFront = sanitizeName(currentFront?.Nombre_Frente || "Sin_Frente");
    const folderLocality = sanitizeName(currentLocality?.Nombre_Localidad || "Sin_Localidad");
    const activityTag = sanitizeName(catalog.selectedActivity?.Nombre_Actividad || "Evidencia").substring(0, 30);

    const sessionUser = session.sessionUser;
    const selectedDetail = catalog.selectedDetail;

    const evidenceFiles = evidence.evidenceFiles.map((file, index) => {
      const order = index + 1;
      const fileName = `${activityTag}_${timestamp}_${order}.jpg`;
      return {
        file,
        order,
        fileName,
        path: `${folderProject}/${folderFront}/${folderLocality}/${fileName}`,
      };
    });

    const persistPendingRecord = async (reason: string) => {
      const pendingRecord = createPendingReportPayload({
        timestamp,
        bucketName: MASTER_BUCKET,
        evidenceFiles: evidenceFiles.map((image) => ({
          file: image.file,
          fileName: image.fileName,
          path: image.path,
          fileType: "image/jpeg",
        })),
        userId: sessionUser.id,
        detailId: selectedDetail.ID_DetallesActividad,
        lat: evidence.gpsLocation?.latitude || selectedDetail.Latitud || 0,
        lng: evidence.gpsLocation?.longitude || selectedDetail.Longitud || 0,
        comment: evidence.note,
        ohms: isPatActivity ? parsedOhms : null,
      });
      await savePendingReport(pendingRecord);
      console.info("[SAVE] Registro guardado localmente en pendingUploads", {
        reason,
        timestamp,
        files: pendingRecord.meta.fileNames?.length || 0,
      });
      showToast("Guardado localmente (Pendiente)", "info");
      handleGoHome();
    };

    try {
      if (!session.isOnline) {
        await persistPendingRecord("offline-first");
        return;
      }

      const saveResult = await saveReportOnline({
        bucket: MASTER_BUCKET,
        detailId: selectedDetail.ID_DetallesActividad,
        lat: evidence.gpsLocation?.latitude || selectedDetail.Latitud,
        lng: evidence.gpsLocation?.longitude || selectedDetail.Longitud,
        userId: sessionUser.id,
        comment: evidence.note,
        ohms: isPatActivity ? parsedOhms : null,
        evidenceFiles: evidenceFiles.map((image) => ({
          file: image.file,
          order: image.order,
          fileName: image.fileName,
          path: image.path,
          fileType: "image/jpeg",
        })),
      });
      await records.loadUserRecords();
      if (saveResult.exceeded) {
        showToast(`Guardado: Se ha superado el metrado (Total: ${saveResult.accumulated})`, "info");
      } else {
        showToast("Reporte guardado exitosamente", "success");
      }
      handleGoHome();
    } catch (err) {
      if (isNetworkUnavailableError(err)) {
        console.warn("[SAVE] Error de red detectado; aplicando fallback a pendingUploads", err);
        await persistPendingRecord("network-fallback");
        return;
      }

      console.error(err);
      showToast("Error al guardar", "error");
    } finally { session.setIsLoading(false); }
  };

  const selectProject = (id: number) => {
    void catalog.selectProject(id).then(() => {
      setStep("item");
    });
  };

  const selectItem = (item: string) => {
    catalog.selectItem(item);
    setStep("front");
  };

  const selectFront = (id: number) => {
    catalog.selectFront(id);
    setStep("locality");
  };

  const selectLocality = (id: number) => {
    catalog.selectLocality(id);
    setStep(catalog.hasSubstationsForLocality(id) ? "substation" : "detail");
  };

  const selectSubstation = (substation: string) => {
    catalog.selectSubstation(substation);
    setStep("detail");
  };

  const selectStructure = (structure: string) => {
    catalog.selectStructure(structure);
    setStep("group");
  };

  const selectGroup = (group: string) => {
    catalog.selectGroup(group);
    setStep("activity");
  };

  const selectActivity = (activityId: number) => {
    const resolvedSelection = catalog.selectActivity(activityId);
    if (!resolvedSelection) return;
    setStep("confirm");
  };

  const goBack = () => {
    const previousStep: Step =
      step === "front" ? "item"
      : step === "locality" ? "front"
      : step === "substation" ? "locality"
      : step === "detail" ? (catalog.hasSubstationsForCurrentSelection ? "substation" : "locality")
      : step === "group" ? "detail"
      : step === "activity" ? "group"
      : step === "confirm" ? "activity"
      : step === "map" ? "project"
      : step === "form" ? "confirm"
      : step === "profile" ? "project"
      : step === "user_records" ? "profile"
      : step === "files" ? "profile"
      : "project";

    setStep(previousStep);
  };

  const handleLoginBridge = () => {
    session.handleLogin(async (authenticatedUser) => {
      await bootstrapAuthenticatedUser(authenticatedUser, "login");
    });
  };

  const handleLogoutBridge = async () => {
    await session.handleLogout();
    catalog.resetSelection();
    setStep("auth");
    setIsMenuOpen(false);
  };

  const requestDeleteAccount = () => {
    setConfirmModal({
      open: true,
      title: "Eliminar cuenta",
      message: "¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        try {
          await handleLogoutBridge();
          showToast("Tu solicitud de eliminación fue registrada", "info");
        } catch {
          showToast("No se pudo completar", "error");
        } finally {
          setConfirmModal(null);
        }
      },
    });
  };

  const getMapUrl = () => { const lat = evidence.gpsLocation?.latitude ?? catalog.selectedDetail?.Latitud; const lng = evidence.gpsLocation?.longitude ?? catalog.selectedDetail?.Longitud; return (lat && lng) ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.005}%2C${lat-0.005}%2C${lng+0.005}%2C${lat+0.005}&layer=mapnik&marker=${lat}%2C${lng}` : null; };


  return {
    step, setStep, isMenuOpen, setIsMenuOpen, toast, confirmModal, setConfirmModal,
    isOnline: session.isOnline, syncStatus,
    isLoading: session.isLoading, sessionUser: session.sessionUser,
    authLoadingLabel: session.authLoadingLabel, setAuthLoadingLabel: session.setAuthLoadingLabel,
    authEmail: session.authEmail, setAuthEmail: session.setAuthEmail, authPassword: session.authPassword, setAuthPassword: session.setAuthPassword, authMode: session.authMode, setAuthMode: session.setAuthMode,
    authMessage: session.authMessage,
    recoveryView: recovery.view,
    recoveryMessage: recovery.message,
    recoveryEmail: recovery.email,
    setRecoveryEmail: recovery.setEmail,
    recoveryPassword: recovery.password,
    setRecoveryPassword: recovery.setPassword,
    recoveryPasswordConfirm: recovery.passwordConfirm,
    setRecoveryPasswordConfirm: recovery.setPasswordConfirm,
    recoveryIsLoading: recovery.isLoading,
    recoveryLoadingLabel: recovery.loadingLabel,
    openRecoveryRequest: () => recovery.openRequest(session.authEmail.trim()),
    closeRecovery: recovery.closeRecovery,
    requestRecovery: recovery.handleRequestReset,
    submitRecoveryPassword: recovery.handleUpdatePassword,
    profileName: session.profileName, setProfileName: session.setProfileName, profileLastName: session.profileLastName, setProfileLastName: session.setProfileLastName, profileEmail: session.profileEmail, isProfileSaving: session.isProfileSaving,
    handleLogin: handleLoginBridge, handleLogout: handleLogoutBridge, saveProfile: session.saveProfile, requestDeleteAccount,
    projectAccessCode, setProjectAccessCode, isJoiningProject, handleJoinProjectWithCode,

    projects: catalog.projects,
    fronts: catalog.fronts,
    localities: catalog.localities,
    filteredFronts: catalog.filteredFronts,
    filteredLocalities: catalog.filteredLocalities,
    localitySearch: catalog.localitySearch,
    setLocalitySearch: catalog.setLocalitySearch,
    items: catalog.items,
    filteredItems: catalog.filteredItems,
    itemSearch: catalog.itemSearch,
    setItemSearch: catalog.setItemSearch,
    selectedItem: catalog.selectedItem,
    substationsForCurrentSelection: catalog.substationsForCurrentSelection,
    filteredSubstations: catalog.filteredSubstations,
    hasSubstationsForCurrentSelection: catalog.hasSubstationsForCurrentSelection,
    substationSearch: catalog.substationSearch,
    setSubstationSearch: catalog.setSubstationSearch,
    selectedSubstation: catalog.selectedSubstation,
    structures: catalog.structures,
    filteredStructures: catalog.filteredStructures,
    selectedStructure: catalog.selectedStructure,
    groups: catalog.groups,
    filteredGroups: catalog.filteredGroups,
    groupSearch: catalog.groupSearch,
    setGroupSearch: catalog.setGroupSearch,
    selectedGroup: catalog.selectedGroup,
    expandedGroups: catalog.expandedGroups,
    groupActivityPreviewMap: catalog.groupActivityPreviewMap,
    groupsWithPreviousRecords,
    toggleGroupExpanded: catalog.toggleGroupExpanded,

    selectedDetail: catalog.selectedDetail,
    selectedActivity: catalog.selectedActivity,
    filteredActivities: catalog.filteredActivities,
    activitiesWithPreviousRecords,
    detailSearch: catalog.detailSearch,
    setDetailSearch: catalog.setDetailSearch,

    selectedProjectId: catalog.selectedProjectId, selectedFrontId: catalog.selectedFrontId, selectedLocalityId: catalog.selectedLocalityId,
    selectProject, selectItem, selectFront, selectLocality, selectSubstation, selectStructure, selectGroup, selectActivity,
    gpsLocation: evidence.gpsLocation, handleCaptureGps: evidence.handleCaptureGps,
    utmZone: evidence.utmZone, setUtmZone: evidence.setUtmZone, utmEast: evidence.utmEast, setUtmEast: evidence.setUtmEast, utmNorth: evidence.utmNorth, setUtmNorth: evidence.setUtmNorth, handleUpdateFromUtm: evidence.handleUpdateFromUtm,
    evidenceImages: evidence.evidenceImages, evidencePreview: evidence.evidencePreview, handleCaptureFile: evidence.handleCaptureFile, removeEvidenceImage: evidence.removeEvidenceImage, note: evidence.note, setNote: evidence.setNote, isFetchingGps: evidence.isFetchingGps, isAnalyzing: evidence.isAnalyzing, aiFeedback: evidence.aiFeedback,
    ohms: evidence.ohms, setOhms: evidence.setOhms, isPatActivity: isPuestaTierra(catalog.selectedActivity),
    saveReport, getMapUrl,
    map,
    userRecords: records.userRecords, isLoadingRecords: records.isLoadingRecords, selectedRecordId: records.selectedRecordId, setSelectedRecordId: records.setSelectedRecordId,
    requestDeleteRecord: records.requestDeleteRecord,
    handleDownloadCSV: records.handleCreateCSV,
    isPhotoModalOpen: records.isPhotoModalOpen,
    openEditModal: records.openEditModal,
    closeEditModal: () => records.setIsPhotoModalOpen(false),
    editComment: records.editComment, setEditComment: records.setEditComment, editPreviewUrl: records.editPreviewUrl, handleEditFileSelect: (e:any) => { if(e.target.files?.[0]) { records.setEditEvidenceFile(e.target.files[0]); records.setEditPreviewUrl(URL.createObjectURL(e.target.files[0])); } },
    saveRecordEdits: records.saveRecordEdits,
    handleGoHome, goBack,
    previousRecord,
    isAlreadyRegistered
  };
}








