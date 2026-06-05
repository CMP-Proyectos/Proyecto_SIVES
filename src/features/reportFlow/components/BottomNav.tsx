import React from "react";
import { Camera, FileSpreadsheet, Home, Map, User } from "lucide-react";
import { styles } from "../../../theme/styles";
import { Step } from "../types";

interface Props {
  step: Step;
  onNavHome: () => void;
  onNavMap: () => void;
  onNavRecords: () => void;
  onNavFiles: () => void;
  onNavProfile: () => void;
}

export const BottomNav = ({
  step,
  onNavHome,
  onNavMap,
  onNavRecords,
  onNavFiles,
  onNavProfile,
}: Props) => {
  const isHomeActive = !["map", "user_records", "files", "profile"].includes(step);
  const isMapActive = step === "map";
  const isRecordsActive = step === "user_records";
  const isFilesActive = step === "files";
  const isProfileActive = step === "profile";

  const getIconColor = (isActive: boolean) => (isActive ? "#003366" : "#64748B");
  const getItemStyle = (isActive: boolean) => ({
    ...styles.bottomNavItem,
    ...(isActive ? styles.bottomNavItemActive : {}),
  });

  return (
    <div style={styles.bottomNav}>
      <button onClick={onNavHome} style={getItemStyle(isHomeActive)}>
        <Home
          size={24}
          color={getIconColor(isHomeActive)}
          strokeWidth={isHomeActive ? 2.5 : 2}
          style={{ marginBottom: 4 }}
        />
        <span style={styles.navLabel}>Inicio</span>
      </button>

      <button onClick={onNavRecords} style={getItemStyle(isRecordsActive)}>
        <Camera
          size={24}
          color={getIconColor(isRecordsActive)}
          strokeWidth={isRecordsActive ? 2.5 : 2}
          style={{ marginBottom: 4 }}
        />
        <span style={styles.navLabel}>Galeria</span>
      </button>

      <button onClick={onNavMap} style={getItemStyle(isMapActive)}>
        <Map
          size={24}
          color={getIconColor(isMapActive)}
          strokeWidth={isMapActive ? 2.5 : 2}
          style={{ marginBottom: 4 }}
        />
        <span style={styles.navLabel}>Mapa</span>
      </button>

      <button onClick={onNavFiles} style={getItemStyle(isFilesActive)}>
        <FileSpreadsheet
          size={24}
          color={getIconColor(isFilesActive)}
          strokeWidth={isFilesActive ? 2.5 : 2}
          style={{ marginBottom: 4 }}
        />
        <span style={styles.navLabel}>Archivos</span>
      </button>

      <button onClick={onNavProfile} style={getItemStyle(isProfileActive)}>
        <User
          size={24}
          color={getIconColor(isProfileActive)}
          strokeWidth={isProfileActive ? 2.5 : 2}
          style={{ marginBottom: 4 }}
        />
        <span style={styles.navLabel}>Cuenta</span>
      </button>
    </div>
  );
};
