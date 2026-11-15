# T-007 — Endpoint de historial de investigaciones
Complejidad: MEDIA · Asignado a: GAREN · Fecha: 2026-11-15 · Depende de: T-006

## Objetivo
Exponer el historial guardado: listar investigaciones y abrir una con sus componentes, candidatos, último precio de cada candidato y todas las mediciones anteriores para comparar fechas. Es la base de la pantalla `/history` (plan §5c: `/history` usa `GET /api/research`).

## Contexto
- Plan §4: "Vistas útiles (a crear en Fase 1): último snapshot por candidato".
- Plan §6 Fase 1: la investigación debe poder reabrirse desde `/history` y cada precio debe mostrar tienda, link y fecha/hora.
- Hasta que exista login, el dueño es `APP_OWNER_USER_ID` y se consulta con el cliente de servidor de T-006, filtrando siempre por `user_id`.

## Qué reutilizar
- `src/lib/db/server.ts` de T-006.
- Tablas de `0001_base.sql`/`0002_v2_ampliaciones.sql`: `researches`, `research_components`, `candidates`, `price_snapshots`, `price_fetch_runs`.

## Entregable
1. `supabase/migrations/0003_vistas_fase1.sql`: vista `public.latest_price_per_candidate` (`distinct on (candidate_id, store)` ordenado por `captured_at desc`) creada `with (security_invoker = true)` para que respete RLS. Agregar `perf_per_million = perf_index / (price_ars / 1000000)` cuando haya `perf_index` (fórmula del plan §4).
2. `src/app/api/research/route.ts`: `GET` → `[{ id, title, status, created_at, updated_at, delivered_at, components }]` ordenado por `created_at desc`; `components` = cantidad. Parámetros `limit` (default 20, máx 100) y `offset`.
3. `src/app/api/research/[id]/route.ts`: `GET` → investigación con `components[]`, cada uno con `pricing_status`, `fetch_runs` (último intento por tienda) y `candidates[]`, cada candidato con `latest[]` (de la vista) y, si `?history=1`, `snapshots[]` completos ordenados por `captured_at`. 404 si no existe o es de otro `user_id`.
4. Ambos endpoints requieren `Authorization: Bearer <CRON_SECRET>` hasta que haya login; sin él, 401.
5. Fechas devueltas en ISO (UTC); el formateo a `America/Argentina/Buenos_Aires` lo hace la UI.

## Límites
- Solo `supabase/migrations/0003_vistas_fase1.sql`, `src/app/api/research/**` y README.
- No modificar `0001`/`0002` ni `src/lib/db/*` de T-006 (si hace falta un cambio, reportalo).
- Solo lectura: estos endpoints no escriben nada.
- Sin dependencias nuevas.

## Criterios de terminado (los verifica NASUS)
- `npm run build` termina con exit 0.
- Sin `Authorization`: 401 en ambos endpoints.
- Con Supabase y los datos que dejó T-006: `GET /api/research` lista la investigación de prueba; `GET /api/research/<id>?history=1` muestra 2 snapshots del mismo candidato con `captured_at` distintos, y cada snapshot trae `store`, `url` y `captured_at`.
- `0003_vistas_fase1.sql` corre sin errores en el SQL editor de Supabase. Que `security_invoker` esté soportado en la versión de Postgres del proyecto: confirmarlo al correrlo.
- Sin Supabase listo: estado PARCIAL con build y 401 verificados.

## Formato de reporte
HECHO / PARCIAL / BLOQUEADO, archivos tocados, comandos y exit code, JSON de ejemplo de ambos endpoints (recortado a 1 componente) y cualquier problema de esquema.
