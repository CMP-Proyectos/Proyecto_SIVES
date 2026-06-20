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
    nombre.includes("foto de") &&
    grupo.includes("resistividad")
  );
};

export const getOpcionesSeleccion = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);
  if (grupo.includes("servidumbre") && nombre.includes("llegada a la")) {
    return [
      { value: "no_servidumbre", label: "No tiene servidumbre" },
      { value: "si_servidumbre", label: "Si tiene servidumbre" } 
    ];
  }
  return null; 
};

export const isIngresoPorArchivo = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  const palabrasClaveArchivo = [
    "ortofoto",
    "modelo digital",
    "excel", 
    "plano",
    "laboratorio", 
    "informe",
    "autorización",
    "acta"
  ];

  return palabrasClaveArchivo.some((palabra) => nombre.includes(palabra));
};

export const parseOhmsValue = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
