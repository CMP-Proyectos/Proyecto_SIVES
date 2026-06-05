export const normalizeText = (value?: string | null) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const isPuestaTierra = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  return (
    grupo.includes("pat") ||
    nombre.includes("pat") ||
    (grupo.includes("puesta") && grupo.includes("tierra")) ||
    (nombre.includes("puesta") && nombre.includes("tierra"))
  );
};

export const parseOhmsValue = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
