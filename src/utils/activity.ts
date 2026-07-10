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
    "autorizacion",
    "acta",
    "padron",
    "autoridad"
  ];

  return palabrasClaveArchivo.some((palabra) => nombre.includes(palabra));
};

export const isRegistroUsuarios = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  return (
    nombre.includes("registro de") &&
    grupo.includes("padron")
  );
};

export const requiereCoordenadas = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  const actividadesConCoordenadas = [
    "llegada a la localidad",
    "fotografia de ejecucion",
    "5. hitos",
    "extraccion de muestra",
    "estacado",
    "registro de"
  ];
  return actividadesConCoordenadas.some((palabra) => nombre.includes(palabra));
};

export const parseOhmsValue = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
