import React from "react";
import { ChevronLeft, Wifi, WifiOff } from "lucide-react";
import { styles } from "../../../theme/styles";
import { Step } from "../types";

interface Props {
  step: Step;
  isOnline: boolean;
  onBack: () => void;
  breadcrumbNames: {
    project?: string;
    item?: string;
    front?: string;
    locality?: string;
    substation?: string;
    detail?: string;
    group?: string;
    activity?: string;
  };
}

export const TopNav = ({ step, isOnline, onBack, breadcrumbNames }: Props) => {
  if (step === "auth") return null;

  const isRootScreen =
    step === "project" ||
    step === "map" ||
    step === "profile" ||
    step === "user_records" ||
    step === "files";

  return (
    <>
      <div style={styles.navbar}>
        <div style={styles.navbarBrand}>CMP CONTRATISTAS SAC.</div>
      </div>

      <div style={styles.statusBar}>
        <div
          style={{
            color: isOnline ? "#10B981" : "#64748B",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isOnline ? "CONECTADO" : "OFFLINE"}</span>
        </div>

        {!isRootScreen && (
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "1px solid #CBD5E1",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "11px",
              fontWeight: "600",
              color: "#334155",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <ChevronLeft size={14} /> Atras
          </button>
        )}
      </div>

      {!isRootScreen && (
        <div style={styles.breadcrumbs}>
          {breadcrumbNames.project && <span style={styles.breadcrumbItem}>{breadcrumbNames.project}</span>}
          {breadcrumbNames.item && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.item}</span>
            </>
          )}
          {breadcrumbNames.front && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.front}</span>
            </>
          )}
          {breadcrumbNames.locality && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.locality}</span>
            </>
          )}
          {breadcrumbNames.substation && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.substation}</span>
            </>
          )}
          {breadcrumbNames.detail && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.detail}</span>
            </>
          )}
          {breadcrumbNames.group && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.group}</span>
            </>
          )}
          {breadcrumbNames.activity && (
            <>
              <span>/</span>
              <span>{breadcrumbNames.activity}</span>
            </>
          )}
        </div>
      )}
    </>
  );
};
