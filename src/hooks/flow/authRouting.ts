export const getRecoveryUrlState = () => {
  if (typeof window === "undefined") {
    return { hasRecoveryQuery: false, hasRecoveryHash: false, hasRecoveryError: false };
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.toLowerCase();

  return {
    hasRecoveryQuery: searchParams.get("recovery") === "1",
    hasRecoveryHash: hash.includes("type=recovery") || hash.includes("access_token="),
    hasRecoveryError: hash.includes("otp_expired") || hash.includes("error=") || hash.includes("error_code="),
  };
};

export const hasRecoveryContextInUrl = () => {
  const urlState = getRecoveryUrlState();
  return urlState.hasRecoveryQuery || urlState.hasRecoveryHash || urlState.hasRecoveryError;
};

export const clearRecoveryUrl = () => {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
};
