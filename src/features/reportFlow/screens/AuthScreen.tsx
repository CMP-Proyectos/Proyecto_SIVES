import React from "react";
import { styles } from "../../../theme/styles";

type AuthMessage = {
  type: "success" | "error" | "info";
  text: string;
} | null;

interface Props {
  authEmail: string;
  setAuthEmail: (val: string) => void;
  authPassword: string;
  setAuthPassword: (val: string) => void;
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
  isLoading: boolean;
  authLoadingLabel: string;
  authMessage: AuthMessage;
  syncStatus: string;
  onLogin: () => void;
  recoveryView: "request" | "update" | null;
  recoveryMessage: AuthMessage;
  recoveryEmail: string;
  setRecoveryEmail: (val: string) => void;
  recoveryPassword: string;
  setRecoveryPassword: (val: string) => void;
  recoveryPasswordConfirm: string;
  setRecoveryPasswordConfirm: (val: string) => void;
  recoveryIsLoading: boolean;
  recoveryLoadingLabel: string;
  onOpenRecoveryRequest: () => void;
  onCloseRecovery: () => void | Promise<void>;
  onRequestRecovery: () => void;
  onSubmitRecoveryPassword: () => void;
}

const feedbackStyles: Record<NonNullable<AuthMessage>["type"], React.CSSProperties> = {
  success: {
    backgroundColor: "#F0FDF4",
    color: "#166534",
    border: "1px solid #BBF7D0",
  },
  error: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    border: "1px solid #FECACA",
  },
  info: {
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
    border: "1px solid #BFDBFE",
  },
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#64748B",
  marginBottom: "8px",
};

const infoPanelStyle: React.CSSProperties = {
  backgroundColor: "#F8FAFC",
  border: "1px solid #E2E8F0",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "18px",
};

const warningPanelStyle: React.CSSProperties = {
  backgroundColor: "#FFF7ED",
  border: "1px solid #FED7AA",
  borderRadius: "8px",
  padding: "12px 14px",
  marginBottom: "18px",
  color: "#9A3412",
  fontSize: "12px",
  lineHeight: 1.5,
};

const brandingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  width: "100%",
  maxWidth: "100%",
  margin: "0 auto 12px",
};

const brandingShieldStyle: React.CSSProperties = {
  width: "100px",
  maxWidth: "28%",
  height: "auto",
  objectFit: "contain",
};

const brandingSloganStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "260px",
  height: "auto",
  objectFit: "contain",
  flex: "1 1 auto",
  minWidth: 0,
};

export const AuthScreen = ({
  authEmail,
  setAuthEmail,
  authPassword,
  setAuthPassword,
  authMode,
  setAuthMode,
  isLoading,
  authLoadingLabel,
  authMessage,
  syncStatus,
  onLogin,
  recoveryView,
  recoveryMessage,
  recoveryEmail,
  setRecoveryEmail,
  recoveryPassword,
  setRecoveryPassword,
  recoveryPasswordConfirm,
  setRecoveryPasswordConfirm,
  recoveryIsLoading,
  recoveryLoadingLabel,
  onOpenRecoveryRequest,
  onCloseRecovery,
  onRequestRecovery,
  onSubmitRecoveryPassword,
}: Props) => {
  const isLogin = authMode === "login";
  const activeMessage = recoveryView ? recoveryMessage : recoveryMessage || authMessage;
  const isRecoveryFlow = recoveryView !== null;

  const renderRequestRecovery = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onRequestRecovery();
      }}
    >
      <div style={{ ...infoPanelStyle, marginBottom: "16px" }}>
        <div style={sectionTitleStyle}>Recuperación de contraseña</div>
        <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
          Ingrese su usuario (email) para recibir un enlace de recuperación.
        </div>
      </div>

      <div>
        <label style={styles.label}>Usuario (email)</label>
        <input
          type="email"
          placeholder="usuario@empresa.com"
          value={recoveryEmail}
          onChange={(event) => setRecoveryEmail(event.target.value)}
          style={styles.input}
          disabled={recoveryIsLoading}
        />
      </div>

      <button
        type="submit"
        disabled={recoveryIsLoading}
        style={{
          ...styles.btnPrimary,
          opacity: recoveryIsLoading ? 0.7 : 1,
          cursor: recoveryIsLoading ? "wait" : "pointer",
        }}
      >
        {recoveryIsLoading ? recoveryLoadingLabel : "Enviar enlace de recuperación"}
      </button>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button type="button" onClick={onCloseRecovery} style={styles.btnLink}>
          Volver a iniciar sesión
        </button>
      </div>
    </form>
  );

  const renderUpdateRecovery = () => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmitRecoveryPassword();
      }}
    >
      <div style={{ ...infoPanelStyle, marginBottom: "16px" }}>
        <div style={sectionTitleStyle}>Restablecer contraseña</div>
        <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
          Cree una nueva contraseña para su cuenta.
        </div>
      </div>

      <div>
        <label style={styles.label}>Nueva contraseña</label>
        <input
          type="password"
          placeholder="Ingrese su nueva contraseña"
          value={recoveryPassword}
          onChange={(event) => setRecoveryPassword(event.target.value)}
          style={styles.input}
          disabled={recoveryIsLoading}
        />
      </div>

      <div>
        <label style={styles.label}>Confirmar contraseña</label>
        <input
          type="password"
          placeholder="Vuelva a escribir su nueva contraseña"
          value={recoveryPasswordConfirm}
          onChange={(event) => setRecoveryPasswordConfirm(event.target.value)}
          style={styles.input}
          disabled={recoveryIsLoading}
        />
      </div>

      <button
        type="submit"
        disabled={recoveryIsLoading}
        style={{
          ...styles.btnPrimary,
          opacity: recoveryIsLoading ? 0.7 : 1,
          cursor: recoveryIsLoading ? "wait" : "pointer",
        }}
      >
        {recoveryIsLoading ? recoveryLoadingLabel : "Actualizar contraseña"}
      </button>

      <div style={{ marginTop: "20px", textAlign: "center" }}>
        <button type="button" onClick={onCloseRecovery} style={styles.btnLink}>
          Cancelar y volver a iniciar sesión
        </button>
      </div>
    </form>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ ...styles.card, width: "100%", maxWidth: "560px", padding: "32px", maxHeight: "none" }}>
        <div style={{ marginBottom: "24px", textAlign: "center" }}>
          {isRecoveryFlow ? (
            <h1 style={{ ...styles.heading, borderBottom: "none", fontSize: "24px", marginBottom: "8px" }}>
              {recoveryView === "request" ? "Recuperación de contraseña" : "Restablecer contraseña"}
            </h1>
          ) : (
            <div style={brandingRowStyle}>
              <img src="/iconos/escudo.jpg" alt="Escudo CMP" style={brandingShieldStyle} />
              <img src="/iconos/slogan.jpg" alt="SIVEO" style={brandingSloganStyle} />
            </div>
          )}
          <p style={{ ...styles.text, color: "#64748B", fontSize: "14px", margin: 0 }}>
            {recoveryView === "request"
              ? "Ingrese su usuario (email) para recibir un enlace de recuperación."
              : recoveryView === "update"
                ? "Ingrese su nueva contraseña para completar el cambio."
                : "Plataforma para registrar y consultar reportes de campo."}
          </p>
        </div>

        <div style={infoPanelStyle}>
          <div style={{ fontSize: "13px", color: "#334155", lineHeight: 1.6 }}>
            Plataforma interna para registrar y consultar reportes de campo.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginTop: "14px" }}>
            <div>
              <div style={sectionTitleStyle}>Responsable</div>
              <div style={{ fontSize: "13px", color: "#0F172A" }}>CMP Contratistas Generales SAC.</div>
            </div>
            <div>
              <div style={sectionTitleStyle}>Uso permitido</div>
              <div style={{ fontSize: "13px", color: "#0F172A" }}>Solo para personal autorizado.</div>
            </div>
            <div>
              <div style={sectionTitleStyle}>Soporte</div>
              <div style={{ fontSize: "13px", color: "#0F172A" }}>
                Comuníquese con el área de TI o escriba a:{" "}
                <a href="mailto:cmpproyectos027@gmail.com">cmpproyectos027@gmail.com</a>
              </div>
            </div>
          </div>
        </div>

        <div style={warningPanelStyle}>
          Acceso restringido. Si no forma parte del equipo autorizado o no reconoce esta plataforma, no ingrese sus datos y comuníquese con soporte.
        </div>

        {activeMessage ? (
          <div
            style={{
              ...feedbackStyles[activeMessage.type],
              borderRadius: "6px",
              padding: "12px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {activeMessage.text}
          </div>
        ) : null}

        {recoveryView === "request" ? (
          renderRequestRecovery()
        ) : recoveryView === "update" ? (
          renderUpdateRecovery()
        ) : (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onLogin();
              }}
            >
              <div>
                <label style={styles.label}>Usuario (email)</label>
                <input
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  style={styles.input}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label style={styles.label}>Contraseña</label>
                <input
                  type="password"
                  placeholder="********"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  style={styles.input}
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  ...styles.btnPrimary,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "wait" : "pointer",
                }}
              >
                {isLoading ? authLoadingLabel : isLogin ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>

            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "8px",
                border: "1px dashed #CBD5E1",
                backgroundColor: "#FAFCFF",
              }}
            >
              <div style={sectionTitleStyle}>Recuperación de contraseña</div>
              <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.5, marginBottom: "8px" }}>
                Solicite un enlace de recuperación si no recuerda su contraseña.
              </div>
              <button type="button" onClick={onOpenRecoveryRequest} style={{ ...styles.btnLink, paddingLeft: 0 }} disabled={isLoading}>
                ¿Olvidó su contraseña?
              </button>
            </div>

            <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
              <button type="button" onClick={() => setAuthMode(isLogin ? "signup" : "login")} style={styles.btnLink}>
                {isLogin ? "¿Aún no tiene acceso? Cree su cuenta." : "Volver a iniciar sesión"}
              </button>
            </div>
          </>
        )}

        {syncStatus && !recoveryView && (
          <div
            style={{
              marginTop: "20px",
              padding: "10px",
              backgroundColor: "#F0FDF4",
              color: "#166534",
              fontSize: "12px",
              textAlign: "center",
              borderRadius: "4px",
            }}
          >
            Estado: {syncStatus === "ONLINE" ? "conectado" : syncStatus === "OFFLINE" ? "sin conexión" : syncStatus}
          </div>
        )}
      </div>
    </div>
  );
};
