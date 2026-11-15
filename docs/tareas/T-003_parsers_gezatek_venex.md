# T-003 — Ajuste de adaptadores Gezatek y Venex
Complejidad: MEDIA · Asignado a: GAREN · Fecha: 2026-11-14

## Contexto (verificado por NASUS hoy, con el build corriendo en local)
`GET /api/scrape-test?q=rtx%203060`:
- venex: http 200, `no_items_parsed`. Un fetch con PowerShell a la misma URL devolvió la página de desafío de Cloudflare ("Just a moment...", "Enable JavaScript and cookies to continue", `_cf_chl_opt`). Venex ya no sirve con fetch directo.
- compragamer: `requires_js` (esperado).
- fullh4rd: `http_403` (esperado).
- gezatek: ok, pero solo 1 ítem. El HTML crudo está en `docs/samples/gezatek_rtx3060.html` (253 KB, "3060" aparece 13 veces).

## Objetivo
1. **Gezatek**: que el parser devuelva todos los productos de la página de resultados (hasta 5 en la respuesta), con título, precio final, precio de lista, url absoluta y stock. Basate en la estructura real de `docs/samples/gezatek_rtx3060.html`; no adivines selectores.
2. **Detección de bloqueo** (todas las tiendas, en `http.ts`/`factory.ts`): si el HTML contiene marcas de desafío de Cloudflare (`_cf_chl_opt`, `cdn-cgi/challenge-platform`, título "Just a moment"), devolver `ok:false, error:"cloudflare_challenge"` en lugar de `no_items_parsed`.
3. **Prueba offline**: agregar `scripts/parse-sample.mjs` o test equivalente que corra el parser de Gezatek sobre el sample y muestre la cantidad de ítems. Debe correr con `node` sin servidor.

## Límites
- Solo `src/lib/stores/*`, `scripts/` y README. No tocar SQL, docs/tareas ni dependencias (salvo justificarlo).
- No vas a tener shell: escribí el código y devolvé los comandos exactos de verificación.

## Criterio de terminado (lo verifica NASUS)
- `next build` pasa.
- La prueba offline devuelve ≥ 3 ítems de Gezatek con precio > 0 y url que empieza con https://gezatek.com.ar/.
- `/api/scrape-test` reporta venex como `cloudflare_challenge`.

## Formato de reporte
HECHO / PARCIAL / BLOQUEADO, archivos tocados, comandos a correr, qué selectores usaste y por qué.
