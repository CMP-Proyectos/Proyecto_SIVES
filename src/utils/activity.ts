export const normalizeText = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const isCuadroTexto = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  return (
    nombre.includes("instalacion de pat") ||
    grupo.includes("conductores") ||
    grupo.includes("acometida")
  );
};

export const getOpcionesSeleccion = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  // Caso 1: Armados
  if (grupo.includes("armados")) {
    return [
      { value: "tiene_alargador", label: "Tiene alargador" },
      { value: "no_tiene_alargador", label: "No tiene alargador" } 
    ];
  }

  // Caso 2: PAT
  if (nombre.includes("relleno y compactacion de pat")) {
    return [
      { value: "sin_cemento", label: "Sin cemento conductivo" },
      { value: "con_cemento", label: "Con cemento conductivo" }
    ];
  }

  // Si no cumple ninguna, no hay selección
  return null; 
};

export const parseOhmsValue = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
