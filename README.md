# SIVES

Aplicación web/mobile desarrollada con Expo, React Native Web y Supabase para registrar, consultar y gestionar reportes de campo con evidencias fotográficas, geolocalización GPS/UTM, validación asistida por IA, historial local y sincronización offline.

## Main Stack

- Expo / React Native
- Expo Router
- React Native Web
- TypeScript
- Supabase
- Dexie para almacenamiento local/offline
- MapLibre GL para visualización de registros georreferenciados
- Supabase Edge Functions y Gemini para validación de imágenes
- Zod para validación de esquemas
- GitHub Actions para validación automática de código

## Requisitos

- Node.js 20 o superior
- npm
- Proyecto en Supabase
- Secret `GEMINI_API_KEY` configurado en Supabase Edge Functions

## Instalación

```bash
npm install
```

## Variables de entorno

Archivo `.env` en la raíz del proyecto.

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_URL=
```

Notas:

- `EXPO_PUBLIC_SUPABASE_URL`: URL del proyecto en Supabase.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: clave pública `anon` de Supabase.
- `EXPO_PUBLIC_APP_URL`: URL pública de la app, usada para flujos como recuperación de contraseña.

La API key de Gemini no debe exponerse en Expo. Configurar `GEMINI_API_KEY` como secret privado de Supabase para la Edge Function `validar-foto-ia`.

## Ejecución local

```bash
npm run start
```

Para abrir en web:

```bash
npm run web
```

Para Android:

```bash
npm run android
```

Para iOS:

```bash
npm run ios
```

## Scripts disponibles

```bash
npm run lint
```

Ejecuta revisión de lint.

```bash
npm run type-check
```

Ejecuta validación de tipos TypeScript sin generar archivos.

```bash
npm run check
```

Ejecuta lint y type-check en conjunto.

## Validación antes de subir cambios

Antes de hacer commit, ejecutar:

```bash
npm run check
```

Este comando debe pasar correctamente antes de abrir un Pull Request o subir cambios a la rama principal.

## CI con GitHub Actions

El proyecto incluye un workflow básico de GitHub Actions en:

```txt
.github/workflows/ci.yml
```

Este workflow se ejecuta en `push` y `pull_request` hacia ramas principales, y valida:

- instalación limpia de dependencias;
- lint;
- type-check.

El objetivo del CI es detectar errores antes de integrar cambios al repositorio principal.

## Estructura del proyecto

```txt
app/
  Rutas principales de Expo Router.

src/features/reportFlow/
  Pantallas, componentes y tipos propios del flujo principal de reportes.

src/hooks/
  Hooks de coordinación de flujo.

src/hooks/flow/
  Hooks especializados por responsabilidad:
  - sesión;
  - catálogo;
  - evidencias;
  - imágenes;
  - GPS/UTM;
  - mapa;
  - registros;
  - recuperación de contraseña.

src/repositories/
  Acceso directo a Supabase y Storage.

src/services/
  Servicios de negocio, almacenamiento local, sincronización offline y servicios externos.

src/lib/
  Utilidades transversales del proyecto.

src/types/
  Tipos compartidos de TypeScript.

src/schema/
  Esquemas de validación.

src/theme/
  Estilos compartidos.
```

## Arquitectura interna

La app separa responsabilidades en capas.

```txt
Pantallas / componentes
        ↓
Hooks de flujo
        ↓
Services / repositories
        ↓
Supabase / Dexie / APIs externas
```

### Hooks

Los hooks manejan estado de pantalla, coordinación del flujo y comunicación con la UI.

Ejemplos:

```txt
useReportFlow
useEvidenceFlow
useGpsLocation
useEvidenceImages
useRecordsFlow
useMapFlow
useSessionFlow
```

### Repositories

Los repositories encapsulan operaciones directas contra Supabase y Storage.

```txt
src/repositories/records.repository.ts
src/repositories/reports.repository.ts
```

Regla: los repositories no deben manejar UI, navegación, toasts ni estados React.

### Services

Los services contienen lógica de negocio o integración con sistemas externos.

```txt
src/services/offlineSyncService.ts
src/services/dataService.ts
src/services/db_local.ts
src/services/GoogleAI.ts
src/services/supabaseClient.ts
```

### Offline sync

La lógica offline está concentrada principalmente en:

```txt
src/services/offlineSyncService.ts
```

Este service se encarga de:

- crear payloads pendientes;
- guardar reportes pendientes localmente;
- leer pendientes;
- sincronizar pendientes cuando vuelve la conexión;
- eliminar pendientes sincronizados correctamente.

La UI y los toasts deben permanecer en `useReportFlow`.

### Logger

El logger centralizado está en:

```txt
src/lib/logger.ts
```

Debe usarse para registrar errores internos con contexto, evitando exponer datos sensibles como tokens, claves, imágenes completas o payloads grandes.

## Flujo principal de reporte

De forma simplificada:

```txt
1. El usuario inicia sesión.
2. Selecciona proyecto, frente, localidad, grupo, actividad y detalle.
3. Captura GPS o ingresa coordenadas UTM.
4. Adjunta evidencia fotográfica.
5. La imagen puede ser validada con IA.
6. El reporte se guarda online si hay conexión.
7. Si no hay conexión o falla la red, se guarda localmente.
8. Cuando vuelve la conexión, los pendientes se sincronizan.
```

## Mapa de registros

La app permite consultar registros georreferenciados mediante MapLibre.

El mapa muestra registros con coordenadas y permite alternar entre vistas filtradas según el flujo de consulta implementado.

## Convención de commits

Usar una convención simple basada en Conventional Commits.

```txt
feat: nueva funcionalidad
fix: corrección de bug
refactor: cambio interno sin alterar comportamiento
chore: configuración o mantenimiento
docs: documentación
style: cambios visuales o formato
test: pruebas
```

Ejemplos:

```txt
feat: add global map filters
fix: prevent duplicated offline reports
refactor: extract report repository
refactor: split evidence flow hooks
chore: add github actions ci
docs: add project setup guide
```

## Reglas de trabajo

Antes de modificar una funcionalidad sensible:

1. Ejecutar `npm run check`.
2. Hacer cambios pequeños e incrementales.
3. Evitar mezclar refactors con cambios visuales.
4. No cambiar base de datos, RLS, buckets o RPCs dentro de refactors de frontend.
5. Verificar manualmente el flujo online y offline si se toca `useReportFlow`, `reports.repository.ts` u `offlineSyncService.ts`.

## Zonas sensibles

Tener especial cuidado al modificar:

```txt
src/hooks/useReportFlow.ts
src/services/offlineSyncService.ts
src/repositories/reports.repository.ts
src/services/db_local.ts
src/services/supabaseClient.ts
```

Cambios en estos archivos pueden afectar guardado online, fallback offline, sincronización de pendientes o autenticación.

## Seguridad

No subir al repositorio:

- `.env`;
- claves privadas;
- service role key de Supabase;
- tokens de Vercel;
- tokens personales;
- archivos `.pem`, `.key` o credenciales locales.

La clave `anon` de Supabase puede usarse en frontend, pero debe manejarse mediante variables de entorno y no como valor hardcodeado dentro del código.

## Pendientes recomendados

- Crear `.env.example`.
- Documentar configuración de Supabase.
- Documentar configuración de deploy web.
- Evaluar secrets de GitHub Actions para deploy.
- Evaluar Vercel solo cuando el CI básico esté estable.
- Agregar pruebas unitarias para servicios críticos.
- Revisar logs pendientes en `dataService.ts`.
