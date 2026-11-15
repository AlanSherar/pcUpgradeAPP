# Fase 1 — Índice de tareas (parsers, guardado en Supabase, historial)
Autor: NASUS · Fecha: 2026-11-15 · Plan: `docs/pcUpgradeAPP_plan_v2.md` (§3.3, §4, §4b, §5b ítem 26, §5c, §6 Fase 1)

Este lote cubre solo la parte de datos de la Fase 1: que los precios scrapeados queden guardados en Supabase y que se puedan consultar después. Login, wizard de relevamiento, compatibilidad con IA, métricas y la vista `/history` van en specs posteriores.

## Estado de partida (verificado por NASUS el 2026-11-15 en el repo, commit `0a8406e`)
- `node scripts/parse-sample.mjs` (Node v22.23.5), todos con exit 0 y "TODO OK":
  - `gezatek_rtx3060.html` "rtx 3060": 1 tarjeta, 1 ítem.
  - `venex_rtx3060.html` "rtx 3060": 2 tarjetas, 2 ítems, `priceKind: cash`, acentos bien (charset iso-8859-1).
  - `gezatek_placas.html` "placa de video" (MIN_ITEMS=3): 57 tarjetas, 5 ítems.
  - `venex_placas.html` "placa de video" (MIN_ITEMS=3): 12 tarjetas, 5 ítems.
- Las migraciones `0001_base.sql` y `0002_v2_ampliaciones.sql` existen pero **no se ejecutaron**: no hay proyecto de Supabase.
- No hay `@supabase/supabase-js` en `package.json`.
- `price_snapshots.candidate_id` es `NOT NULL`: un precio scrapeado no se puede guardar sin un `candidates` asociado. T-006 resuelve esto.

## Tareas
| ID | Archivo | Complejidad | Asignado | Depende de |
|---|---|---|---|---|
| T-005 | `fase-1-T-005_regresion_parsers.md` | BAJA | TEEMO | — |
| T-006 | `fase-1-T-006_guardado_supabase.md` | ALTA | GAREN | Proyecto Supabase con migraciones corridas (Commander) |
| T-007 | `fase-1-T-007_endpoint_historial.md` | MEDIA | GAREN | T-006 |

Regla de asignación: BAJA → TEEMO; MEDIA y ALTA → GAREN. Cada recluta puede partir su tarea en subtareas más simples; el detalle de la tarea principal no se delega.

## Lo que necesita el Commander antes de T-006
1. Crear el proyecto de Supabase (región más cercana a Argentina).
2. Correr `supabase/migrations/0001_base.sql` y `0002_v2_ampliaciones.sql` en el SQL editor.
3. Crear su usuario en Supabase Auth y copiar su `user_id` (uuid).
4. Completar `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `APP_OWNER_USER_ID`.

Sin estos pasos T-006 y T-007 se pueden escribir y compilar, pero su verificación en vivo queda PARCIAL.

## Verificación de NASUS al cierre del lote
Corre los comandos de cada spec, revisa a mano 3 filas de `price_snapshots` contra la tienda (link, precio, fecha/hora) y reporta al Commander HECHO / PARCIAL / BLOQUEADO por tarea.
