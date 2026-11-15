# T-005 — Regresión de parsers Venex y Gezatek
Complejidad: BAJA · Asignado a: TEEMO · Fecha: 2026-11-15

## Objetivo
Un solo comando que corra los parsers de Venex y Gezatek sobre los 4 samples guardados y falle si alguno devuelve menos ítems de los esperados. Sirve para detectar que un cambio en los parsers rompió algo antes de guardar precios en Supabase (T-006).

## Contexto (verificado por NASUS el 2026-11-15)
`scripts/parse-sample.mjs` ya existe, acepta `[archivo] [consulta] [gezatek|venex]` y la variable `MIN_ITEMS`, y sale con código 1 si falla. Resultados de hoy:

| Sample | Consulta | Ítems devueltos |
|---|---|---|
| `docs/samples/gezatek_rtx3060.html` | `rtx 3060` | 1 |
| `docs/samples/venex_rtx3060.html` | `rtx 3060` | 2 |
| `docs/samples/gezatek_placas.html` | `placa de video` | 5 |
| `docs/samples/venex_placas.html` | `placa de video` | 5 |

Nota: T-003 pedía ≥ 3 ítems de Gezatek en `rtx 3060`; el sample real solo trae 1 tarjeta, así que el mínimo de ese caso es 1. No es un fallo del parser.

## Qué reutilizar
- `scripts/parse-sample.mjs` tal cual: no reescribir su lógica.
- Los 4 samples de `docs/samples/`.

## Entregable
1. `scripts/parse-all-samples.mjs`: recorre una tabla con los 4 casos de arriba (archivo, consulta, tienda, mínimo = la columna "Ítems devueltos"), ejecuta `parse-sample.mjs` para cada uno con `child_process.spawnSync(process.execPath, [...])` y `MIN_ITEMS` en `env`, imprime una línea `OK`/`FALLÓ` por caso y sale con código 1 si alguno falló.
2. En `package.json`, script nuevo: `"test:parsers": "node scripts/parse-all-samples.mjs"`.
3. En `README.md`, una línea bajo "Prueba de tiendas" con `npm run test:parsers`.

## Límites
- Solo `scripts/parse-all-samples.mjs`, el bloque `scripts` de `package.json` y `README.md`.
- No tocar `src/`, `docs/samples/`, SQL ni dependencias.
- No bajar los mínimos para que pase: si un caso falla, reportarlo.

## Criterios de terminado (los verifica NASUS)
- `npm run test:parsers` termina con exit 0 y muestra 4 líneas `OK`.
- Si se cambia a mano un mínimo a 99, el comando termina con exit 1 (prueba de que detecta fallos; después se vuelve al valor real).

## Formato de reporte
HECHO / PARCIAL / BLOQUEADO, archivos tocados, salida completa de `npm run test:parsers`. Si no tenés shell, devolvé los comandos exactos y NASUS los corre.
