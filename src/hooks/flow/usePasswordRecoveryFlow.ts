import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../services/dataService";
import { clearRecoveryUrl, getRecoveryUrlState } from "./authRouting";

type RecoveryView = "request" | "update" | null;
type RecoveryMessage = {
  type: "success" | "error" | "info";
  text: string;
} | null;

const RECOVERY_SESSION_STORAGE_KEY = "password_recovery_active";
const DEFAULT_APP_URL = "https://sistema-de-verificacion.vercel.app";

const getFriendlyAuthErrorMessage = (error: any) => {
  const rawMessage = String(error?.message || error?.code || "").toLowerCase();

  if (rawMessage.includes("auth session missing")) {
    return "No se pudo actualizar la contraseña porque la sesión de recuperación no está activa. Solicite un nuevo enlace e inténtelo nuevamente.";
  }

  if (rawMessage.includes("password should contain at least one character of each")) {
    return "La contraseña debe contener al menos una mayúscula, una minúscula y un número.";
  }

  if (
    rawMessage.includes("otp_expired") ||
    rawMessage.includes("expired") ||
    rawMessage.includes("invalid") ||
    rawMessage.includes("session_not_found") ||
    rawMessage.includes("flow state")
  ) {
    return "El enlace de recuperación expiró o ya no es válido. Solicite un nuevo enlace para continuar.";
  }

  return error?.message || "Ocurrió un error inesperado.";
};

const buildRecoveryRedirectTo = () => {
  const configuredAppUrl = process.env.EXPO_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
  const normalizedAppUrl = configuredAppUrl.replace(/\/+$/, "");
  return `${normalizedAppUrl}/?recovery=1`;
};

const getStoredRecoveryFlag = () => {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(RECOVERY_SESSION_STORAGE_KEY) === "1";
};

const setStoredRecoveryFlag = (isActive: boolean) => {
  if (typeof window === "undefined") return;

  if (isActive) {
    window.sessionStorage.setItem(RECOVERY_SESSION_STORAGE_KEY, "1");
    return;
  }

  window.sessionStorage.removeItem(RECOVERY_SESSION_STORAGE_KEY);
};

const getRecoveryActivationMessage = (urlState: ReturnType<typeof getRecoveryUrlState>): RecoveryMessage => {
  if (urlState.hasRecoveryError) {
    return {
      type: "error",
      text: "El enlace de recuperación expiró o ya no es válido. Solicite uno nuevo para continuar.",
    };
  }

  if (urlState.hasRecoveryQuery || urlState.hasRecoveryHash) {
    return {
      type: "info",
      text: "Ingrese su nueva contraseña para completar la recuperación.",
    };
  }

  return null;
};

export function usePasswordRecoveryFlow(
  showToast: (msg: string, type: "success" | "error" | "info") => void
) {
  const initialUrlState = useMemo(() => getRecoveryUrlState(), []);
  const initialStoredRecovery = useMemo(() => getStoredRecoveryFlag(), []);
  const [view, setView] = useState<RecoveryView>(
    initialStoredRecovery || initialUrlState.hasRecoveryQuery || initialUrlState.hasRecoveryHash || initialUrlState.hasRecoveryError ? "update" : null
  );
  const [message, setMessage] = useState<RecoveryMessage>(
    initialStoredRecovery
      ? {
          type: "info",
          text: "Ingrese su nueva contraseña para completar la recuperación.",
        }
      : getRecoveryActivationMessage(initialUrlState)
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("ENVIANDO...");
  const [hasResolvedInitialCheck, setHasResolvedInitialCheck] = useState(false);
  const recoverySessionDetectedRef = useRef(
    initialStoredRecovery || initialUrlState.hasRecoveryQuery || initialUrlState.hasRecoveryHash || initialUrlState.hasRecoveryError
  );

  const isRecoveryContextActive = view !== null || recoverySessionDetectedRef.current;

  const openRequest = (nextEmail?: string) => {
    setEmail(nextEmail || "");
    setPassword("");
    setPasswordConfirm("");
    setMessage(null);
    setLoadingLabel("ENVIANDO...");
    setIsLoading(false);
    setView("request");
  };

  const activateUpdate = (nextMessage?: RecoveryMessage) => {
    console.info("[RECOVERY] Activando vista de actualizacion", {
      hasStoredFlag: getStoredRecoveryFlag(),
    });
    recoverySessionDetectedRef.current = true;
    setStoredRecoveryFlag(true);
    setPassword("");
    setPasswordConfirm("");
    setIsLoading(false);
    setLoadingLabel("ACTUALIZANDO...");
    setView("update");
    setMessage(
      nextMessage || {
        type: "info",
        text: "Ingrese su nueva contraseña para completar la recuperación.",
      }
    );
  };

  const closeRecovery = async (nextMessage: RecoveryMessage = null) => {
    console.info("[RECOVERY] Cerrando flujo de recuperacion");
    setIsLoading(false);
    setLoadingLabel("ENVIANDO...");
    setView(null);
    setMessage(nextMessage);
    setPassword("");
    setPasswordConfirm("");
    recoverySessionDetectedRef.current = false;
    setStoredRecoveryFlag(false);
    clearRecoveryUrl();
    await supabase.auth.signOut();
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      console.info("[RECOVERY] Auth event", { event });
      if (event === "PASSWORD_RECOVERY") {
        activateUpdate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const syncRecoveryFromUrl = () => {
      const urlState = getRecoveryUrlState();
      console.info("[RECOVERY] Revisando URL", urlState);

      if (getStoredRecoveryFlag()) {
        activateUpdate(
          urlState.hasRecoveryError
            ? getRecoveryActivationMessage(urlState)
            : {
                type: "info",
                text: "Ingrese su nueva contraseña para completar la recuperación.",
              }
        );
        setHasResolvedInitialCheck(true);
        return;
      }

      if (!urlState.hasRecoveryQuery && !urlState.hasRecoveryHash && !urlState.hasRecoveryError) {
        setHasResolvedInitialCheck(true);
        return;
      }

      activateUpdate(getRecoveryActivationMessage(urlState));
      setHasResolvedInitialCheck(true);
    };

    syncRecoveryFromUrl();
    window.addEventListener("hashchange", syncRecoveryFromUrl);

    return () => {
      window.removeEventListener("hashchange", syncRecoveryFromUrl);
    };
  }, []);

  const handleRequestReset = async () => {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setMessage({ type: "error", text: "Ingrese su usuario (email) para enviar el enlace." });
      return;
    }

    setIsLoading(true);
    setLoadingLabel("ENVIANDO...");
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(nextEmail, {
        redirectTo: buildRecoveryRedirectTo(),
      });
      if (error) throw error;

      setMessage({
        type: "success",
        text: "Enlace enviado. Puede cerrar esta pestaña y abrir el enlace de restablecimiento de contraseña enviado a su correo electrónico. Revise también la carpeta de spam o correo no deseado.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: getFriendlyAuthErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!password.trim() || !passwordConfirm.trim()) {
      setMessage({ type: "error", text: "Complete ambos campos de contraseña." });
      return;
    }

    if (password !== passwordConfirm) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    setIsLoading(true);
    setLoadingLabel("ACTUALIZANDO...");
    setMessage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        throw new Error("Auth session missing");
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      const successMessage = {
        type: "success",
        text: "Contraseña actualizada. Inicie sesión con su nueva clave.",
      } as const;

      showToast(successMessage.text, "success");
      await closeRecovery(successMessage);
    } catch (error) {
      setPassword("");
      setPasswordConfirm("");
      setMessage({
        type: "error",
        text: getFriendlyAuthErrorMessage(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    view,
    message,
    email,
    setEmail,
    password,
    setPassword,
    passwordConfirm,
    setPasswordConfirm,
    isLoading,
    loadingLabel,
    hasResolvedInitialCheck,
    isRecoveryContextActive,
    openRequest,
    activateUpdate,
    closeRecovery,
    handleRequestReset,
    handleUpdatePassword,
  };
}
