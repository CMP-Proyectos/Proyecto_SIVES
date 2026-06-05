import { z } from 'zod';

const GpsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const UtmCoordinatesSchema = z.object({
  zone: z.string().min(1).max(3),
  east: z.number(),
  north: z.number(),
});

export const SaveReportSchema = z.object({
  evidenceFiles: z.array(z.instanceof(Blob, { message: 'Cada archivo de evidencia debe ser valido' }))
    .min(1, 'Debe adjuntar al menos una imagen')
    .max(5, 'Solo se permiten hasta 5 imagenes'),
  sessionUser: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
  }),
  selectedDetail: z.object({
    ID_DetallesActividad: z.number().positive(),
    Latitud: z.number().min(-90).max(90),
    Longitud: z.number().min(-180).max(180),
  }),
  gpsLocation: GpsCoordinatesSchema.optional(),
  utmCoordinates: UtmCoordinatesSchema.optional(),
  note: z.string().max(1000).optional(),
  projectInfo: z.object({
    projectId: z.number().positive(),
    frontId: z.number().positive(),
    localityId: z.number().positive(),
    activityName: z.string().min(1).max(100),
  }),
  isAnalyzing: z.boolean(),
  isOnline: z.boolean(),
}).refine((data: any) => {
  return data.gpsLocation || (data.selectedDetail.Latitud && data.selectedDetail.Longitud);
}, {
  message: "Se requieren coordenadas GPS validas",
  path: ["gpsLocation"],
});

export const SaveReportResponseSchema = z.object({
  success: z.boolean(),
  recordId: z.number().optional(),
  publicUrl: z.string().url().optional(),
  message: z.string(),
  isOffline: z.boolean(),
  exceeded: z.boolean().optional(),
  accumulated: z.number().optional(),
});

export type SaveReportInput = z.infer<typeof SaveReportSchema>;
export type SaveReportResponse = z.infer<typeof SaveReportResponseSchema>;

export const validateSaveReportInput = (data: unknown): SaveReportInput => {
  return SaveReportSchema.parse(data);
};

export const safeValidateSaveReportInput = (data: unknown) => {
  return SaveReportSchema.safeParse(data);
};
