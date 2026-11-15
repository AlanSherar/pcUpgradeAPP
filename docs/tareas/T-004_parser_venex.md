# T-004 — Parser de Venex
Complejidad: MEDIA · Asignado a: GAREN · Fecha: 2026-11-14

## Contexto verificado por NASUS
- `/api/scrape-test?q=rtx%203060` en vivo: venex http 200, `no_items_parsed`.
- Node fetch a la misma URL (UA Chrome, Accept-Language es-AR) devuelve 200, 533 KB, título "Componentes de PC - Envíos a todo el país | Venex", 45 apariciones de "3060", SIN `_cf_chl_opt`. No es Cloudflare: es el parser.
- Sample guardado tal como lo recibe Node: `docs/samples/venex_rtx3060.html`.
- La página parece estar en ISO-8859-1/windows-1252 (acentos rotos al leerla como UTF-8). Verificá el charset en el `<meta>` o header.

## Objetivo
1. Extractor propio de Venex (como hiciste con `gezatek-parse.ts`), con selectores tomados del HTML real: título, precio final (contado efectivo → `priceKind:"cash"`), precio de lista si existe, url absoluta, stock si figura.
2. Decodificar correctamente el charset (TextDecoder con el charset de la página) para que los títulos salgan con acentos bien.
3. Extender `scripts/parse-sample.mjs` para que acepte Venex (ej. tercer argumento `venex|gezatek`, o detección por nombre de archivo).

## Límites
Solo `src/lib/stores/*` y `scripts/`. Sin dependencias nuevas. Sin shell: devolvé comandos exactos.

## Criterio de terminado (lo verifica NASUS)
- Prueba offline sobre el sample: ≥ 3 ítems con precio > 0, url `https://www.venex.com.ar/...`, títulos sin caracteres rotos.
- `next build` pasa.
- En vivo `/api/scrape-test?q=rtx%203060`: venex `ok:true`.

## Formato de reporte
HECHO / PARCIAL / BLOQUEADO, archivos tocados, selectores y por qué, comandos.
