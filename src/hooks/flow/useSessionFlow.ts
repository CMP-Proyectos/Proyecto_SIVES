import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, clearAllLocalData, hasSupabaseConnectivity } from "../../services/dataService";
import { ConfirmModalState } from "../../features/reportFlow/types";
import { hasRecoveryContextInUrl } from "./authRouting";

type AuthMessage = {
  type: "success" | "error" | "info";
  text: string;
} | null;

export type SessionUser = {
  email: string;
  id: string;
};

export function useSessionFlow(
  showToast: (msg: string, type: "success" | "error" | "info") => void,
  setConfirmModal: (modal: ConfirmModalState | null) => void
) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [authLoadingLabel, setAuthLoadingLabel] = useState("AUTENTICANDO...");
  const [authMessage, setAuthMessage] = useState<AuthMessage>(null);
  const [hasResolvedInitialSession, setHasResolvedInitialSession] = useState(false);

  const [profileName, setProfileName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const initialSessionCheckStartedRef = useRef(false);

  const refreshConnectivityStatus = useCallback(async (origin: string) => {
    if (typeof navigator === "undefined") return;

    if (!navigator.onLine) {
      console.info("[AUTH] Estado de conectividad confirmado como offline", { origin, source: "navigator" });
      setIsOnline(false);
      return;
    }

    const hasConnectivity = await hasSupabaseConnectivity(`session:${origin}`);
    console.info("[AUTH] Estado de conectividad confirmado", { origin, hasConnectivity });
    setIsOnline(hasConnectivity);
  }, []);

  const applySession = useCallback((nextUser: SessionUser | null, origin: string) => {
    console.info("[AUTH] Aplicando sesion", {
      origin,
      userId: nextUser?.id ?? null,
      email: nextUser?.email ?? null,
      hasRecoveryContext: hasRecoveryContextInUrl(),
    });
    setSessionUser(nextUser);
  }, []);

  const readStoredSession = useCallback(async (origin: string) => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const nextUser = data.session?.user
        ? { email: data.session.user.email || "", id: data.session.user.id }
        : null;

      console.info("[AUTH] Resultado de getSession", {
        origin,
        restored: Boolean(nextUser),
        hasRecoveryContext: hasRecoveryContextInUrl(),
      });

      applySession(nextUser, `${origin}:getSession`);
      return nextUser;
    } catch (error) {
      console.error("[AUTH] No se pudo leer la sesion persistida", { origin, error });
      applySession(null, `${origin}:error`);
      return null;
    } finally {
      setHasResolvedInitialSession(true);
    }
  }, [applySession]);

  useEffect(() => {
    void setConfirmModal;

    if (!initialSessionCheckStartedRef.current) {
      initialSessionCheckStartedRef.current = true;
      void readStoredSession("mount");
      void refreshConnectivityStatus("mount");
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const nextUser = currentSession?.user
        ? { email: currentSession.user.email || "", id: currentSession.user.id }
        : null;

      console.info("[AUTH] Auth state change", {
        event,
        hasSession: Boolean(currentSession?.user),
        hasRecoveryContext: hasRecoveryContextInUrl(),
      });

      applySession(nextUser, `auth:${event}`);
      setHasResolvedInitialSession(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [applySession, readStoredSession, refreshConnectivityStatus, setConfirmModal]);

  useEffect(() => {
    const handleOnline = () => {
      void refreshConnectivityStatus("online-event");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.info("[AUTH] Evento offline recibido; conectividad marcada como false");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshConnectivityStatus]);

  const checkSession = async () => readStoredSession("checkSession");

  const handleLogin = async (onSuccess: (user: SessionUser) => void | Promise<void>) => {
    setIsLoading(true);
    setAuthLoadingLabel("AUTENTICANDO...");
    setAuthMessage(null);

    try {
      let authenticatedUser: SessionUser | null = null;

      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        if (!data.user) {
          showToast("Verifica tu correo", "info");
          return;
        }
        authenticatedUser = { email: data.user.email || "", id: data.user.id };
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword.trim(),
        });
        if (error) throw error;
        if (data.user) {
          authenticatedUser = { email: data.user.email || "", id: data.user.id };
        }
      }

      if (authenticatedUser) {
        applySession(authenticatedUser, "handleLogin");
        await onSuccess(authenticatedUser);
      }
    } catch (error: any) {
      const message = error?.message || "No se pudo completar el inicio de sesión.";
      setAuthMessage({ type: "error", text: message });
      showToast(message, "error");
    } finally {
      setAuthLoadingLabel("AUTENTICANDO...");
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearAllLocalData();
      await supabase.auth.signOut();
      applySession(null, "handleLogout");
      setAuthMessage(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      applySession(null, "handleLogout:error");
    }
  };

  const loadProfileData = async () => {
    if (!sessionUser) return;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Error al obtener usuario autenticado:", authError);
    }

    const authUser = authData.user;
    setProfileEmail(authUser?.email || sessionUser.email || "");

    const { data: profileData, error: profileError } = await supabase
      .from("Detalle_Perfil")
      .select("Nombre, Apellido")
      .eq("id", sessionUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error al cargar perfil:", profileError);
      setProfileName("");
      setProfileLastName("");
      return;
    }

    setProfileName(profileData?.Nombre || "");
    setProfileLastName(profileData?.Apellido || "");
  };

  const saveProfile = async () => {
    if (!sessionUser) return;

    setIsProfileSaving(true);
    try {
      const { error: upsertError } = await supabase.from("Detalle_Perfil").upsert(
        {
          id: sessionUser.id,
          Nombre: profileName,
          Apellido: profileLastName,
        },
        { onConflict: "id" }
      );

      if (upsertError) throw upsertError;

      const { data: persistedProfile, error: reloadError } = await supabase
        .from("Detalle_Perfil")
        .select("Nombre, Apellido")
        .eq("id", sessionUser.id)
        .single();

      if (reloadError) throw reloadError;

      setProfileName(persistedProfile?.Nombre || "");
      setProfileLastName(persistedProfile?.Apellido || "");
      showToast("Perfil actualizado", "success");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      showToast("Error al actualizar", "error");
    } finally {
      setIsProfileSaving(false);
    }
  };

  return {
    isOnline,
    sessionUser,
    isLoading,
    setIsLoading,
    authLoadingLabel,
    setAuthLoadingLabel,
    authMessage,
    setAuthMessage,
    hasResolvedInitialSession,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authMode,
    setAuthMode,
    profileName,
    setProfileName,
    profileLastName,
    setProfileLastName,
    profileEmail,
    isProfileSaving,
    checkSession,
    handleLogin,
    handleLogout,
    loadProfileData,
    saveProfile,
  };
}
