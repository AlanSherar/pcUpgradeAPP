# pcUpgradeAPP

Next.js (App Router, TypeScript) con precios de tiendas argentinas e historial de investigaciones de upgrade de PC. Estado: Fase 0 (solo local). Plan: `docs/pcUpgradeAPP_plan_v2.md`.

## Cómo correr

```cmd
cd /d E:\Software\StarNet\Proyectos\PCupgradeAPP
npm install
npm run build
npm run dev
```

- `GET http://localhost:3000/api/health` devuelve `{ ok: true, app: "pcUpgradeAPP", time: <ISO> }`.
- `GET http://localhost:3000/api/scrape-test?q=rtx%203060` prueba las 4 tiendas por fetch directo y devuelve por tienda `{ store, url, httpStatus, ok, method, items (máx 5), error, ms }`.

## Variables de entorno

Copiar `.env.example` a `.env.local` (ignorado por git) y completar cuando existan las cuentas. Variables (plan v2 §2): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `FIRECRAWL_API_KEY`, `CRON_SECRET`. Sin valores en el repo.

## Migraciones SQL

`supabase/migrations/0001_base.sql` (plan §4) y `0002_v2_ampliaciones.sql` (plan §4b, sin `price_projections`, que es Fase 3). **No ejecutadas**: todavía no hay proyecto de Supabase.

## Qué falta (cuentas)

- Vercel + GitHub: deploy y prueba de las tiendas desde IPs de Vercel.
- Supabase: ejecutar las migraciones y verificar RLS con otro usuario.
- Anthropic: clave de API (no se usa todavía).
- Opcional: Firecrawl o Browserless (Free) para Compra Gamer.

## Prueba de tiendas

Adaptadores en `src/lib/stores/` (uno por tienda; `parse.ts` es un extractor heurístico con cheerio, sin IA). Compra Gamer carga por JavaScript: con fetch directo se espera `ok:false, error:"requires_js"`.

Resultado de la prueba real: **pendiente**. Se escribió sin shell, por eso no se corrió. Completar con la salida de `/api/scrape-test?q=rtx%203060`.
