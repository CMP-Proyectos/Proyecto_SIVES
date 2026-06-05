const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 10_000;

type ValidationRequest = {
  imageBase64?: string;
  mimeType?: string;
  nombreActividad?: string;
};

type IAValidationResult = {
  aprobado: boolean;
  mensaje: string;
  confianza?: number;
  esErrorTecnico?: boolean;
  debug?: unknown;
};

const TECHNICAL_FALLBACK: IAValidationResult = {
  aprobado: true,
  esErrorTecnico: true,
  mensaje: "IA no disponible, revisión manual requerida.",
  confianza: 0,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({
      ...TECHNICAL_FALLBACK,
      mensaje: "Método no permitido, revisión manual requerida.",
      debug: { step: "method_not_allowed", method: req.method },
    });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");

    if (!apiKey) {
      return jsonResponse({
        ...TECHNICAL_FALLBACK,
        mensaje: "IA no configurada: falta GEMINI_API_KEY.",
        debug: { step: "missing_api_key" },
      });
    }

    const body = (await req.json()) as ValidationRequest;

    const imageBase64 = String(body.imageBase64 ?? "").trim();
    const mimeType = String(body.mimeType ?? "image/jpeg").trim();
    const nombreActividad = String(body.nombreActividad ?? "Actividad").trim();

    if (!imageBase64) {
      return jsonResponse({
        ...TECHNICAL_FALLBACK,
        mensaje: "Imagen no recibida, revisión manual requerida.",
        debug: { step: "missing_image" },
      });
    }

    if (!mimeType.startsWith("image/")) {
      return jsonResponse({
        aprobado: false,
        mensaje: "El archivo no es una imagen válida.",
        confianza: 1,
        debug: { step: "invalid_mime_type", mimeType },
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

    let geminiResponse: Response;

    try {
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: buildPrompt(nombreActividad) },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0,
              topP: 0.8,
              maxOutputTokens: 512,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  aprobado: { type: "BOOLEAN" },
                  mensaje: { type: "STRING" },
                  confianza: { type: "NUMBER" },
                },
                required: ["aprobado", "mensaje", "confianza"],
              },
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();

      return jsonResponse({
        ...TECHNICAL_FALLBACK,
        mensaje: "Gemini no respondió correctamente.",
        debug: {
          step: "gemini_http_error",
          status: geminiResponse.status,
          errorText,
        },
      });
    }

    const geminiPayload = await geminiResponse.json();
    const parsedResult = parseGeminiPayload(geminiPayload);

    if (!parsedResult) {
      return jsonResponse({
        ...TECHNICAL_FALLBACK,
        mensaje: "Respuesta IA inválida.",
        debug: {
          step: "invalid_gemini_response",
          geminiPayload,
        },
      });
    }

    return jsonResponse({
      ...parsedResult,
      debug: {
        step: "success",
        model: GEMINI_MODEL,
      },
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && error.name === "AbortError";

    return jsonResponse({
      ...TECHNICAL_FALLBACK,
      mensaje: isTimeout
        ? "IA demoró demasiado, revisión manual requerida."
        : "IA no disponible, revisión manual requerida.",
      debug: {
        step: "catch_error",
        isTimeout,
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
    });
  }
});

function buildPrompt(nombreActividad: string): string {
  return `
Clasifica visualmente la imagen para esta actividad de construcción eléctrica:

${nombreActividad}

Devuelve JSON.

Criterios:
- aprobado=true si la imagen muestra obra eléctrica, poste, estructura, puesta a tierra, retenida, cableado, excavación, material eléctrico o trabajo de campo relacionado.
- aprobado=false si es pantalla, documento, selfie, objeto doméstico, paisaje sin obra o imagen sin relación visible.
- confianza entre 0 y 1.
- mensaje máximo 12 palabras.
`.trim();
}

function parseGeminiPayload(payload: unknown): IAValidationResult | null {
  const data = payload as any;
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    return null;
  }

  for (const part of parts) {
    if (typeof part?.text === "string") {
      const parsed = parseValidationResult(part.text);
      if (parsed) return parsed;
    }

    if (typeof part === "string") {
      const parsed = parseValidationResult(part);
      if (parsed) return parsed;
    }

    if (part && typeof part === "object") {
      const parsed = parseValidationObject(part);
      if (parsed) return parsed;
    }
  }

  return null;
}

function parseValidationResult(rawText: unknown): IAValidationResult | null {
  if (typeof rawText !== "string") return null;

  let clean = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  if (!clean) return null;

  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  }

  try {
    return parseValidationObject(JSON.parse(clean));
  } catch {
    return null;
  }
}

function parseValidationObject(parsed: any): IAValidationResult | null {
  if (!parsed || typeof parsed !== "object") return null;

  if (typeof parsed.aprobado !== "boolean") return null;
  if (typeof parsed.mensaje !== "string") return null;

  const confianzaNumber = Number(parsed.confianza);
  const confianzaFinal = Number.isFinite(confianzaNumber)
    ? Math.max(0, Math.min(1, confianzaNumber))
    : parsed.aprobado
      ? 0.75
      : 0.4;

  return {
    aprobado: parsed.aprobado,
    mensaje: parsed.mensaje.slice(0, 120),
    confianza: confianzaFinal,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}