# T-008 — Interfaz de login (y alta del primer usuario)
Complejidad: MEDIA · Responsable: LUX (diseño y frontend) · Fecha: 2026-11-15 · Pedido: NASUS (por orden del Commander)
Plan: `docs/pcUpgradeAPP_plan_v2.md` §1 (un solo usuario, sin registro abierto), §2 (claves), §5 fila "Login", §8 decisión 4.

## Objetivo
Que el Commander pueda crear su usuario una sola vez y después entrar a la app con email y contraseña. Todo lo que no sea `/login`, `/setup` o `/api/*` exige sesión.

Para quién: el Commander, único usuario. La UNA acción de cada pantalla:
- `/setup`: crear la cuenta del dueño (solo existe mientras la base tenga 0 usuarios).
- `/login`: entrar.

## Decisiones ya tomadas (no se vuelven a discutir)
1. Email + contraseña. Magic link queda para después.
2. Sin registro abierto. Una ruta de servidor crea la cuenta con la service role **solo si Auth tiene 0 usuarios**; con 1 o más usuarios responde cerrado.
3. Sin consumo de créditos de API: solo Supabase Auth. Nadie del equipo llama a Anthropic, Firecrawl ni otro servicio pago en esta tarea.

## Estado de partida (leído hoy en el repo)
- Next.js `^16.4.6`, React `^19.3.0`, ya instalados `@supabase/ssr ^0.12.7` y `@supabase/supabase-js ^2.119.0`. **No hace falta ninguna dependencia nueva.**
- En Next.js 16 `middleware` está deprecado y se llama `proxy` (`src/proxy.ts`, mismo nivel que `app`). Fuente: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- No hay CSS global ni componentes de UI: `src/app/page.tsx` usa estilos inline con Arial. Lenguaje visual de referencia aprobado por el Commander: Arial, fondo `#f7f7f7`, texto `#222222`, superficies `#ffffff`, bordes `#dddddd`/`#eeeeee`. Sobrio, sin decoración.
- Endpoints existentes (`/api/health`, `/api/keys-check`, `/api/scrape-test`) y los de T-006/T-007 (`/api/prices/run`, `/api/research`) se protegen con `CRON_SECRET`. **Esta tarea no los toca.**
- Falta el proyecto de Supabase (ver índice de Fase 1). Sin él la verificación en vivo queda PARCIAL.

## Flujo
```
Visita cualquier pantalla sin sesión ──► /login?next=<ruta>
/login ── consulta GET /api/auth/setup ──► si open=true: aviso "Todavía no hay cuenta" + link a /setup
/setup ── si open=false ──► redirige a /login
/setup ── POST /api/auth/setup ok ──► inicia sesión con esas credenciales ──► /
/login ── ok ──► `next` (solo rutas internas) o /
Con sesión, visitar /login o /setup ──► /
"Salir" (en el layout) ── POST /auth/signout ──► /login
```

---

## 1. SERAPHINE (webdesigner-2) — Especificación
Entrega: `docs/specs/T-008_login_spec.md`. Sin código. EZREAL construye solo a partir de esto.

### 1.1 Pantallas
- **`/login`**: título "pcUpgradeAPP", subtítulo corto, campos Email y Contraseña, botón "Entrar". Mostrar/ocultar contraseña. Sin "olvidé mi contraseña" ni "crear cuenta" (fuera de alcance; anotar como pendiente). Si `open=true`, en lugar del formulario o encima de él: aviso con link "Crear la cuenta del dueño".
- **`/setup`**: título "Crear tu cuenta", explicación de una línea ("Se crea una sola vez. Después el alta queda cerrada."), campos Email, Contraseña, Repetir contraseña, botón "Crear cuenta".
- **Botón "Salir"**: ubicación en el layout cuando hay sesión (mínimo: arriba a la derecha, con el email del usuario a su lado si entra).

### 1.2 Jerarquía
Definir qué se lee de un vistazo (nombre de la app + campo email), qué después (botón), y qué es secundario (aviso de setup, ayudas). Una sola acción primaria por pantalla.

### 1.3 Estados (todos con texto final en español rioplatense)
| Estado | Pantalla | Qué tiene que definir |
|---|---|---|
| Inicial vacío | ambas | foco inicial en Email |
| Validación cliente | ambas | email con formato inválido; contraseña vacía; en setup: menos de 8 caracteres, contraseñas distintas. Mensaje junto al campo, no solo color |
| Enviando | ambas | botón deshabilitado con texto "Entrando…"/"Creando…", sin doble envío |
| Credenciales inválidas | login | mensaje único que no revele si el email existe ("Email o contraseña incorrectos.") |
| Demasiados intentos (429 de Supabase) | login | mensaje con qué hacer ("Esperá unos minutos y probá de nuevo.") |
| Sin conexión / error de red | ambas | mensaje y reintento |
| Configuración incompleta (faltan variables) | ambas | mensaje para el dueño, sin mostrar nombres de claves secretas |
| Alta cerrada (409) | setup | "Ya existe una cuenta. Entrá con tu email." + link a /login |
| Alta ok | setup | transición directa a la app; definir si hay mensaje breve |
| Sesión vencida | login | aviso suave si llega con `?expired=1` |

### 1.4 Textos
Tabla con cada texto visible (títulos, labels, placeholders si los hay, botones, errores, ayudas). Voseo. Sin signos de exclamación en errores.

### 1.5 Accesibilidad
- Labels visibles asociados a cada input (no placeholder como label).
- `autocomplete`: `email` / `current-password` en login, `email` / `new-password` en setup.
- Errores anunciados (`role="alert"` o `aria-live`) y enlazados al campo (`aria-describedby`, `aria-invalid`).
- Foco visible en todo elemento interactivo; tras un error del servidor, el foco va al mensaje o al primer campo con error.
- Contraste mínimo WCAG AA (4.5:1 texto normal) — dar los valores de color y su ratio.
- Áreas táctiles de al menos 44×44 px. Botón mostrar/ocultar con nombre accesible que cambie con el estado.
- Todo usable solo con teclado (Tab, Enter envía).

### 1.6 Responsive
Medidas para 360 px (celular), 768 px (tablet) y 1280 px (escritorio): ancho máximo de la tarjeta, márgenes, tamaño de fuente (mínimo 16 px en inputs para que iOS no haga zoom), sin scroll horizontal. Comportamiento con teclado virtual abierto en celular.

### 1.7 Tokens
Lista corta de valores (colores, radios, espaciados, tipografía) basada en el lenguaje aprobado (Arial, `#f7f7f7`, `#222222`, `#ffffff`, `#dddddd`). Más un color de error y uno de foco con su contraste verificado. No inventar sistema de diseño completo.

### Criterio de terminado de SERAPHINE
Spec con las 6 secciones, cada estado de 1.3 con su texto exacto, y los ratios de contraste calculados. LUX la revisa antes de pasarla a EZREAL.

---

## 2. EZREAL (engineer) — Construcción
Construye a partir de la spec aprobada. Archivos exactos:

| Archivo | Qué hace |
|---|---|
| `src/lib/supabase/browser.ts` | Cliente de navegador con `createBrowserClient` de `@supabase/ssr`, usando solo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `src/lib/supabase/server.ts` | Cliente de servidor con `createServerClient` y las cookies de `next/headers`. Para Server Components, Route Handlers y Server Actions. Si faltan variables: error `missing_env: <nombre>`. |
| `src/lib/supabase/admin.ts` | Cliente con `SUPABASE_SERVICE_ROLE_KEY`, solo servidor (`import "server-only"` o chequeo equivalente), sin sesión persistida. Lo usa **únicamente** la ruta de setup. Si T-006 ya creó `src/lib/db/server.ts` con lo mismo, reusar ese y no crear este archivo (avisar a LUX). |
| `src/proxy.ts` | Refresca la sesión (patrón de `@supabase/ssr` para cookies) y redirige a `/login?next=<ruta>` si no hay usuario. Con usuario, `/login` y `/setup` redirigen a `/`. Matcher que **excluya** `/api/*`, `/_next/static`, `/_next/image`, `favicon.ico` y archivos estáticos, para no romper los endpoints con `CRON_SECRET`. Usar `getUser()` (valida contra Auth), no `getSession()`, para decidir acceso. |
| `src/app/login/page.tsx` | Página de servidor: consulta si el setup está abierto y renderiza el formulario. |
| `src/app/login/login-form.tsx` | Componente cliente: `signInWithPassword`, estados de la spec 1.3, redirección a `next` **solo si empieza con `/` y no con `//`** (evitar open redirect). |
| `src/app/setup/page.tsx` | Página de servidor: si el alta está cerrada, `redirect('/login')`. |
| `src/app/setup/setup-form.tsx` | Componente cliente: valida, llama `POST /api/auth/setup`, si ok inicia sesión con `signInWithPassword` y va a `/`. |
| `src/app/api/auth/setup/route.ts` | `GET` → `{ open: boolean }`. `POST { email, password }` → valida (email con formato, contraseña ≥ 8); cuenta usuarios con el cliente admin (`auth.admin.listUsers` con `perPage: 1`); si hay ≥ 1 → **409** `{ error: "setup_closed" }`; si hay 0 → `auth.admin.createUser({ email, password, email_confirm: true })` → **201** `{ ok: true }` (sin devolver el usuario completo). 400 si el body es inválido, 500 `{ error: "missing_env" }` si faltan variables. `runtime = "nodejs"`, `dynamic = "force-dynamic"`. Nunca loguear la contraseña. |
| `src/app/auth/signout/route.ts` | `POST` → `signOut()` y redirect 303 a `/login`. |
| `src/app/auth.module.css` (o `src/app/login/auth.module.css`, compartido con setup) | Estilos de ambas pantallas según tokens de la spec. |
| `src/app/layout.tsx` | Agregar el botón "Salir" (form POST a `/auth/signout`) visible solo con sesión, y el fondo/tipografía base. Cambio mínimo. |
| `src/app/page.tsx` | Sin cambios funcionales; queda protegida por el proxy. |
| `README.md` | Sección "Login": cómo crear el primer usuario y qué hacer si hay que volver a abrir el alta (borrar el usuario en el panel de Supabase). |

### Límites
- Sin dependencias nuevas.
- No tocar `src/lib/stores/*`, `src/lib/db/*` (T-006), `src/app/api/prices/*`, `src/app/api/research/*` ni migraciones.
- `SUPABASE_SERVICE_ROLE_KEY` nunca llega al navegador: solo se importa desde `admin.ts`/la ruta de setup.
- No llamar a `supabase.auth.signUp` desde el cliente en ningún lugar.
- No reemplazar `APP_OWNER_USER_ID` de T-006/T-007 en esta tarea (migrar esos endpoints a la sesión es otra spec).

### Criterio de terminado de EZREAL (los comandos los corre NASUS en la conversación del Commander; los workers no tienen shell)
```cmd
cd /d E:\Software\StarNet\Proyectos\PCupgradeAPP
npm run build
npm run lint
npm run dev
```
- `npm run build` exit 0, `npm run lint` sin errores.
- `GET /api/health` sigue respondiendo 200 sin sesión (el proxy no lo intercepta).
- Reporte: archivos tocados, salida de los comandos y cualquier diferencia con la spec.

---

## 3. VI (apptester) — Pruebas
Contra `http://localhost:3000` (dev server levantado por NASUS). Anchos: **360×800**, **768×1024**, **1280×800**. Cada caso: resultado, captura y ancho.

### Con Supabase sin usuarios
1. `/` sin sesión redirige a `/login?next=%2F`.
2. `/login` muestra el aviso "Todavía no hay cuenta" con link a `/setup`.
3. `/setup`: enviar vacío → errores junto a cada campo, foco en el primero.
4. `/setup`: email inválido (`foo@`) → error de email.
5. `/setup`: contraseña de 7 caracteres → error de longitud.
6. `/setup`: contraseñas distintas → error en "Repetir contraseña".
7. `/setup`: datos válidos → entra a `/` con sesión. *(Este caso crea el usuario real del Commander: lo hace el Commander, VI solo observa, o VI usa un usuario de prueba que después se borra; decide NASUS.)*

### Con un usuario ya creado
8. `/setup` redirige a `/login`.
9. `POST /api/auth/setup` directo (con `browser_eval`/fetch) → 409 `setup_closed`.
10. `GET /api/auth/setup` → `{ "open": false }`.
11. Login con contraseña incorrecta → "Email o contraseña incorrectos.", sin indicar si el email existe.
12. Login con email inexistente → mismo mensaje exacto que el caso 11.
13. Login correcto → `/`. Recargar la página → sigue con sesión.
14. Con sesión, ir a `/login` → redirige a `/`.
15. `/login?next=/history` + login ok → va a `/history` (aunque dé 404 hoy, la ruta tiene que ser esa).
16. `/login?next=https://evil.example` y `?next=//evil.example` → tras login va a `/`, nunca afuera.
17. "Salir" → vuelve a `/login`; ir a `/` → redirige a login.
18. Doble clic rápido en "Entrar" → una sola petición (ver `browser_network`).
19. Sin red (desconectar o interceptar con `browser_intercept`) → mensaje de error de red, sin pantalla rota.
20. `/api/health` sin sesión → 200 (el proxy no lo bloquea).

### Accesibilidad y layout (en los 3 anchos)
21. Sin scroll horizontal; la tarjeta no se corta; textos de error largos fluyen.
22. Navegación solo con teclado: orden de Tab lógico, foco visible en cada elemento, Enter envía.
23. Cada input tiene label accesible (`browser_snapshot`) y `autocomplete` correcto.
24. Los errores se anuncian (`role="alert"`/`aria-live`) y el campo tiene `aria-invalid="true"`.
25. Botón mostrar/ocultar contraseña: nombre accesible cambia y área táctil ≥ 44×44 px.
26. Inputs con fuente ≥ 16 px en 360 px.
27. Contraste de texto, errores y foco: medir con `browser_inspect` y comparar con la spec.

### Criterio de terminado de VI
Tabla caso × ancho con OK/FALLA, capturas de cada FALLA y pasos para reproducir. VI no arregla código.

---

## 4. Lo que necesita el Commander (no lo hace el equipo)
1. Proyecto de Supabase creado y migraciones corridas (ya listado en el índice de Fase 1).
2. `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. **Desactivar el registro público en Supabase Auth** (Authentication › configuración de proveedores/signups; ubicación exacta **sin verificar**). Motivo: la anon key es pública y sin esto cualquiera podría registrarse con `signUp` aunque nuestra UI no lo ofrezca. La ruta de setup usa la API admin, que según entendemos no depende de ese ajuste: **sin verificar**, VI lo comprueba en el caso 7.
4. Crear su usuario desde `/setup` (caso 7).

## 5. Riesgos y pendientes conocidos
- Carrera en `/setup`: dos POST simultáneos con 0 usuarios podrían crear 2 cuentas. Aceptable para uso personal; si aparece un segundo usuario se borra en el panel. Anotado, no se resuelve en esta tarea.
- Recuperar contraseña: fuera de alcance. Mientras tanto se resetea desde el panel de Supabase.
- T-006/T-007 siguen usando `APP_OWNER_USER_ID` + `CRON_SECRET`; pasarlos a sesión es una spec aparte.
- Que el patrón de cookies de `@supabase/ssr 0.12` encaje sin cambios con `proxy.ts` de Next 16: **sin verificar** hasta el build.

## 6. Orden y revisión
SERAPHINE spec → LUX revisa → EZREAL construye → NASUS corre build/lint/dev → VI prueba → LUX revisa y reporta a NASUS: HECHO / PARCIAL / BLOQUEADO, archivos, comandos con exit code, tabla de VI y pendientes.
Sin Supabase listo: PARCIAL con build, lint, redirecciones del proxy y layout verificados.
