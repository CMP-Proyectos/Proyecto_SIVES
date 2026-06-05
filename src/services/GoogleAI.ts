import { supabase } from "./supabaseClient";

const IA_FUNCTION_NAME = "validar-foto-ia";
const CLIENT_TIMEOUT_MS = 12_000;
const MAX_IMAGE_WIDTH = 1280;
const JPEG_QUALITY = 0.75;
const TECHNICAL_FALLBACK: IAValidationResult = {
  aprobado: true,
  esErrorTecnico: true,
  mensaje: "IA no disponible, revisión manual requerida.",
  confianza: 0,
};

const validationCache = new Map<string, IAValidationResult>();

export interface IAValidationResult {
  aprobado: boolean;
  mensaje: string;
  confianza?: number;
  esErrorTecnico?: boolean;
}

export const validarFotoConIA = async (
  file: File,
  nombreActividad: string,
): Promise<IAValidationResult> => {
  let cacheKey: string | undefined;

  try {
    console.log("[IA FRONT] validarFotoConIA ejecutada", {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      nombreActividad,
    });

    const compressedImage = await compressImageToJpegBase64(file);
    console.log("[IA FRONT] imagen comprimida", {
      mimeType: compressedImage.mimeType,
      base64Length: compressedImage.imageBase64.length,
    });

    cacheKey = await buildCacheKey(compressedImage.imageBase64, nombreActividad);
    const cachedResult = validationCache.get(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    console.log("[IA FRONT] invocando Edge Function", {
      functionName: IA_FUNCTION_NAME,
    });

    const invokePromise = supabase.functions.invoke<IAValidationResult>(IA_FUNCTION_NAME, {
      body: {
        imageBase64: compressedImage.imageBase64,
        mimeType: compressedImage.mimeType,
        nombreActividad,
      },
    });

    const { data, error } = await withTimeout(invokePromise, CLIENT_TIMEOUT_MS);

    console.log("[IA FRONT] respuesta Edge Function", { data, error });

    if (error || !data || typeof data.aprobado !== "boolean" || !data.mensaje) {
      validationCache.set(cacheKey, TECHNICAL_FALLBACK);
      return TECHNICAL_FALLBACK;
    }

    const result: IAValidationResult = {
      aprobado: data.aprobado,
      mensaje: data.mensaje,
      confianza: typeof data.confianza === "number" ? data.confianza : undefined,
      esErrorTecnico: data.esErrorTecnico === true,
    };

    validationCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[IA FRONT] Error IA:", error);
    if (cacheKey) {
      validationCache.set(cacheKey, TECHNICAL_FALLBACK);
    }
    return TECHNICAL_FALLBACK;
  }
};

async function compressImageToJpegBase64(
  file: File,
): Promise<{ imageBase64: string; mimeType: string }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("No se pudo preparar la imagen para IA.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("No se pudo comprimir la imagen."))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });

  return {
    imageBase64: await blobToBase64(blob),
    mimeType: "image/jpeg",
  };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("La imagen no se pudo convertir a base64."));
        return;
      }

      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function buildCacheKey(imageBase64: string, nombreActividad: string): Promise<string> {
  const payload = `${nombreActividad}:${imageBase64.length}:${imageBase64.slice(0, 256)}:${imageBase64.slice(-256)}`;

  if (!crypto.subtle) {
    return payload;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Timeout de validación IA.")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}
