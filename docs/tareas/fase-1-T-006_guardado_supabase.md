# T-006 — Guardado de precios en Supabase
Complejidad: ALTA · Asignado a: GAREN · Fecha: 2026-11-15

## Objetivo
Que una búsqueda de precios para un componente de una investigación quede guardada en Supabase: una fila en `price_fetch_runs` por tienda intentada y una fila en `price_snapshots` por producto encontrado, sin pisar mediciones anteriores.

## Contexto
- Adaptadores en `src/lib/stores/` devuelven `StoreResult` (`types.ts`): `store`, `url`, `httpStatus`, `ok`, `method`, `items[]`, `error`, `ms`. Errores que hoy pueden salir: `cloudflare_challenge`, `http_<n>`, `requires_js`, `no_items_parsed`, `no_relevant_items`, `timeout`, `fetch_failed: ...`.
- Esquema en `supabase/migrations/0001_base.sql` y `0002_v2_ampliaciones.sql`. Tablas que se tocan: `candidates`, `price_snapshots`, `price_fetch_runs`, `research_components` (`pricing_status`).
- `price_snapshots.candidate_id` es `NOT NULL`. Cada producto scrapeado necesita un candidato.
- Plan §4: el service role saltea RLS, así que todo insert del servidor setea `user_id` explícito.
- Plan §5b ítem 26: cada tienda se guarda al llegar, no al final. Si algo se corta, lo ya guardado queda y `pricing_status` pasa a `interrupted`.
- Todavía no hay login (va en otra spec). Mientras tanto el dueño sale de la variable de servidor `APP_OWNER_USER_ID`.

## Qué reutilizar
- `adapters` de `src/lib/stores/index.ts`; no cambiar la interfaz de los adaptadores.
- `StoreItem.priceKind` ya usa los mismos valores que el `check` de `price_snapshots.price_kind`.
- `StoreResult.method` (`direct_fetch`) va directo a `fetch_method`.

## Entregable
1. Dependencia `@supabase/supabase-js` (única dependencia nueva permitida).
2. `src/lib/db/server.ts`: cliente con `SUPABASE_SERVICE_ROLE_KEY`, solo servidor (`import "server-only"` o chequeo equivalente), sin sesión persistida. Si faltan variables, error claro `missing_env: <nombre>`.
3. `src/lib/db/price-mapping.ts`: funciones **puras** (sin red ni Supabase), testeables offline:
   - `fetchRunStatus(result)` → `ok` si `ok`; `blocked` si `cloudflare_challenge` o `http_403`; `empty` si `requires_js`, `no_items_parsed` o `no_relevant_items`; `timeout` si `timeout`; `error` en cualquier otro caso.
   - `toFetchRunRow(result, { userId, researchComponentId, startedAt })`.
   - `normalizeLabel(title)` → minúsculas, sin acentos, espacios colapsados.
   - `toSnapshotRow(item, store, { userId, candidateId, fetchRunId })` con `product_title`, `price_ars`, `list_price_ars`, `price_kind`, `in_stock`, `url`, `fetch_method`, `currency:'ARS'`.
4. `src/lib/db/save-prices.ts`: `savePriceRun({ userId, researchComponentId, query })`:
   - Pone `pricing_status='running'`.
   - Corre los adaptadores en paralelo y guarda **cada tienda apenas responde**: insert en `price_fetch_runs` (con `finished_at`), luego por cada ítem busca candidato por `(research_component_id, normalizeLabel(label))` y si no existe lo crea con `label = title`; luego inserta el snapshot con `fetch_run_id`.
   - Al terminar: `done` si todas las tiendas dieron `ok`, `partial` si alguna sí y otra no, `interrupted` si se lanzó una excepción a mitad.
   - Devuelve resumen `{ stores:[{store,status,saved}], pricingStatus }`.
5. `src/app/api/prices/run/route.ts`: `POST` con body `{ researchComponentId }`. Lee `query` del componente en la base. Requiere header `Authorization: Bearer <CRON_SECRET>`; sin él, 401. `runtime = "nodejs"`, `maxDuration = 60`.
6. `scripts/map-sample.mjs`: corre el parser sobre un sample y luego `price-mapping.ts`, e imprime las filas que se insertarían. Sin red, sin Supabase.
7. `.env.example`: agregar `APP_OWNER_USER_ID=`.

## Límites
- Solo `src/lib/db/*`, `src/app/api/prices/*`, `scripts/map-sample.mjs`, `.env.example`, `package.json`/`package-lock.json` (por la dependencia) y README.
- No modificar migraciones existentes. Si encontrás un error de esquema, no lo arregles: reportalo.
- No tocar `src/lib/stores/*` (lo cubre T-005).
- Nunca update ni delete sobre `price_snapshots`: solo insert.
- Sin claves reales en archivos. Sin IA.

## Criterios de terminado (los verifica NASUS)
Offline (siempre):
- `npm run build` termina con exit 0.
- `node scripts/map-sample.mjs docs/samples/venex_placas.html "placa de video" venex` imprime 1 fila de fetch run con `status: ok` y 5 filas de snapshot con `price_kind: cash`, `price_ars > 0` y url `https://www.venex.com.ar/...`.
- Sin `Authorization`, `POST /api/prices/run` devuelve 401.
Con Supabase listo (si no lo está, el estado es PARCIAL, no BLOQUEADO):
- Con una investigación y un componente creados a mano (query `rtx 3060`), el POST deja ≥ 1 fila en `price_fetch_runs` por tienda y ≥ 1 en `price_snapshots`.
- Correrlo dos veces no duplica candidatos y sí duplica snapshots (historial).
- `pricing_status` queda en `partial` (Compra Gamer y FullH4rd hoy no dan precios).

## Formato de reporte
HECHO / PARCIAL / BLOQUEADO, archivos tocados, comandos y su exit code, salida de `map-sample.mjs`, respuesta JSON del POST (si hubo Supabase) y problemas de esquema encontrados.
