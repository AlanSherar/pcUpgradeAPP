# T-001 — pcUpgradeAPP · Fase 0: repo, health, prueba de scraping y migraciones SQL
Complejidad: ALTA · Asignado a: GAREN · Fecha: 2026-11-14

## Objetivo
Dejar en E:\Software\StarNet\Proyectos\PCupgradeAPP un repo Next.js (App Router, TypeScript) que compile y corra en local, con:
1. `GET /api/health` → 200 `{ ok: true, app: "pcUpgradeAPP", time: <ISO> }`.
2. `GET /api/scrape-test?q=rtx%203060` → prueba las 4 tiendas por fetch directo y devuelve, por tienda: `{ store, url, httpStatus, ok, method:"direct_fetch", items:[{title, priceArs, priceKind, url}] (máx 5), error, ms }`.
3. Migraciones SQL del plan v2 en `supabase/migrations/`.

## Contexto
Plan completo: C:\Users\alans\AppData\Local\StarNet\workspaces\agent\.attachments\a3943320-ccc2-4299-bf58-e8c765e88e34.md (leer §2, §3, §4, §4b, §6 Fase 0, §6b Fase 0).
Todavía NO hay cuentas de Vercel/Supabase/Anthropic: nada de deploy, nada de conectarse a Supabase. Solo local.

## Qué reutilizar
- SQL de §4 y §4b del plan, copiado tal cual salvo correcciones necesarias para que sea válido.
- URLs de prueba de §3.1: Venex `https://www.venex.com.ar/resultado-busqueda.htm?keywords=<q>&order=price_asc`, Compra Gamer `https://compragamer.com/productos?criterio=<q>`, FullH4rd (buscar su URL de búsqueda; si no se puede, la home), Gezatek (idem).
- Interfaz de adaptador §3.3: `searchPrices(query) -> Snapshot[]`, un archivo por tienda en `lib/stores/`.

## Entregable
- Proyecto creado con `npx create-next-app@latest . --ts --app --eslint --no-tailwind --src-dir --import-alias "@/*" --use-npm` (o equivalente no interactivo).
- `src/app/api/health/route.ts`, `src/app/api/scrape-test/route.ts`, `src/lib/stores/{types,venex,compragamer,fullh4rd,gezatek}.ts`. Parseo con regex/cheerio, sin IA (todavía no hay clave). Compra Gamer va a devolver vacío por JS: reportarlo como `ok:false, error:"requires_js"`, no inventar.
- `supabase/migrations/0001_base.sql` (§4), `0002_v2_ampliaciones.sql` (orden de §4b.6: tablas nuevas 4b.2/4b.3, alter 4b.1/4b.3/4b.4, RLS 4b.6). SIN `price_projections` (Fase 3).
- `.env.example` con las variables de §2 (sin valores). `.env.local` en .gitignore.
- `README.md` corto: cómo correr, qué falta (cuentas), resultado de la prueba de tiendas.
- `git init` + primer commit.

## Límites
- No crear cuentas, no deploy, no instalar CLIs globales, no escribir fuera de la carpeta del proyecto.
- Sin claves reales en ningún archivo.
- No tocar /tareas.

## Criterio de terminado
- `npm run build` termina con exit 0.
- Con `npm run dev` (o `npm start`): `/api/health` da 200 y `/api/scrape-test?q=rtx%203060` devuelve JSON con las 4 tiendas.
- Si no tenés shell, dejá los comandos exactos y yo los corro.

## Formato de reporte
Estado HECHO / PARCIAL / BLOQUEADO. Lista de archivos creados. Comandos corridos con su exit code. Tabla de resultado por tienda (status HTTP, items encontrados, 1 ejemplo título+precio). Problemas encontrados.
