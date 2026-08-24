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

  const palabrasClaveGrupo = [
    "resistividad"
  ];
  
  const palabrasClaveArchivo = [
    "calculos",
    "foto de"
  ];

  return (
    palabrasClaveArchivo.some((palabra) => nombre.includes(palabra)) &&
    palabrasClaveGrupo.some((palabra) => grupo.includes(palabra))
  );
};

export const isEncuesta = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);

  return nombre.includes("encuesta") || grupo.includes("encuesta");
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
    "autoridad",
    "calculos",
    "curva",
    "encuesta"
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

export const puedeNoReiniciar = (actividad?: {
  Grupo?: string | null;
  Nombre_Actividad?: string | null;
} | null) => {
  const grupo = normalizeText(actividad?.Grupo);
  const nombre = normalizeText(actividad?.Nombre_Actividad);

    const palabrasClaveNombre = [
      "foto de la",
      "hitos",
      "estaca",
      "registro",
      "fotografia de"
    ];

      const palabrasClaveGrupo = [
      "resistividad",
      "levantamiento topografico",
      "padron"
    ];

  return (
    palabrasClaveNombre.some((palabra) => nombre.includes(palabra)) &&
    palabrasClaveGrupo.some((palabra) => grupo.includes(palabra))
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
    "hitos",
    "extraccion de muestra",
    "estacado",
    "registro de",
    "seccionamiento",
    "puntos de",
    "inventario",
    "subestacion",
    "gps"
  ];
  return actividadesConCoordenadas.some((palabra) => nombre.includes(palabra));
};

export const parseOhmsValue = (value: string) => {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
