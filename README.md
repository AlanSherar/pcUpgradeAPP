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

## Login

Un solo usuario (el dueño), email + contraseña con Supabase Auth. No hay registro abierto ni "olvidé mi contraseña".

Requisitos en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` (esta última solo la usa el servidor, en `src/lib/supabase/admin.ts`). Si faltan, `/login` y `/setup` muestran "La app todavía no está configurada" sin nombrar las claves.

En el panel de Supabase, **desactivar el registro público** de Auth (la anon key es pública y sin ese ajuste cualquiera podría llamar a `signUp`). La ubicación exacta del ajuste en el panel está sin verificar.

### Crear el primer usuario

1. `npm run dev` y abrir `http://localhost:3000`. Sin sesión, todo redirige a `/login`.
2. Con Auth en 0 usuarios, `/login` muestra "Todavía no hay cuenta" con el link "Crear la cuenta del dueño" (`/setup`).
3. En `/setup` completar email y contraseña (mínimo 8 caracteres). La ruta `POST /api/auth/setup` crea la cuenta con la service role (email ya confirmado), inicia sesión y entra a `/`.
4. Desde ese momento el alta queda cerrada: `/setup` redirige a `/login` y `POST /api/auth/setup` responde `409 { "error": "setup_closed" }`.

### Volver a abrir el alta

Borrar el usuario en el panel de Supabase (Authentication › Users). Con 0 usuarios, `/setup` vuelve a estar disponible. También sirve para resetear una contraseña olvidada mientras no exista esa función.

### Qué protege el proxy

`src/proxy.ts` (en Next 16 reemplaza a `middleware`) refresca la sesión y exige usuario en todas las pantallas salvo `/login` y `/setup`. No intercepta `/api/*`: esos endpoints siguen protegidos con `CRON_SECRET`. "Salir" (arriba a la derecha con sesión) hace `POST /auth/signout`.

Riesgo conocido: dos `POST /api/auth/setup` simultáneos con 0 usuarios podrían crear dos cuentas. Si pasa, borrar la sobrante en el panel.
