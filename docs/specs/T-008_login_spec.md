# T-008 — Spec UX/UI: login y alta del primer usuario
Autora: SERAPHINE (webdesigner-2) · Para: LUX (revisión) → EZREAL (construcción) → VI (pruebas) · 2026-11-15
Base: `docs/tareas/fase-1-T-008_login_ui.md` §1. Lenguaje visual aprobado: Arial, `#f7f7f7` / `#222222` / `#ffffff` / `#dddddd` / `#eeeeee` (el mismo que `src/app/page.tsx`). Sin código.

Para quién: el Commander, único usuario. Una acción por pantalla: `/setup` = crear la cuenta del dueño; `/login` = entrar.

---

## 1.1 Pantallas

| Pantalla | Contenido, en orden vertical | Notas |
|---|---|---|
| `/login` (alta cerrada, caso normal) | 1. Aviso de sesión vencida (solo con `?expired=1`) · 2. H1 "pcUpgradeAPP" · 3. Subtítulo · 4. Caja de error del servidor (solo si hay) · 5. Campo Email · 6. Campo Contraseña con botón Mostrar/Ocultar · 7. Botón primario "Entrar" (ancho completo) | `<title>`: "Entrar · pcUpgradeAPP". Sin "olvidé mi contraseña" ni "crear cuenta". |
| `/login` con `open=true` (0 usuarios) | 1. H1 "pcUpgradeAPP" · 2. Aviso "Todavía no hay cuenta." + texto · 3. Link con estilo de botón primario "Crear la cuenta del dueño" → `/setup` | **Decisión: el aviso va EN LUGAR del formulario.** Con 0 usuarios el login no puede funcionar; mostrar ambos pone dos acciones compitiendo. |
| `/login` si `GET /api/auth/setup` falla (red/500 distinto de `missing_env`) | Igual que el caso normal, sin aviso de setup | No bloquear el login por una consulta auxiliar. |
| `/setup` | 1. Línea chica "pcUpgradeAPP" (no es heading) · 2. H1 "Crear tu cuenta" · 3. Explicación de una línea · 4. Caja de error del servidor (solo si hay) · 5. Email · 6. Contraseña + Mostrar/Ocultar + ayuda "Mínimo 8 caracteres." · 7. Repetir contraseña + Mostrar/Ocultar · 8. Botón primario "Crear cuenta" (ancho completo) | `<title>`: "Crear tu cuenta · pcUpgradeAPP". Si `open=false` el servidor redirige a `/login` antes de pintar. |
| Barra "Salir" (layout, solo con sesión) | Barra superior de ancho completo, alto 56 px, fondo `#ffffff`, borde inferior 1 px `#dddddd`. Izquierda: "pcUpgradeAPP" (link a `/`, negrita 16 px). Derecha: email del usuario (14 px, `#555555`) + botón secundario "Salir" | Bajo 480 px de ancho se oculta el email (queda solo "Salir"). El email nunca se trunca con "…": se oculta o entra entero (con `overflow-wrap:anywhere`). "Salir" = `<form method="post" action="/auth/signout">` con `<button type="submit">`. |

## 1.2 Jerarquía

| Nivel | `/login` | `/setup` |
|---|---|---|
| 1 — de un vistazo | H1 "pcUpgradeAPP" (28 px negrita) + campo Email con foco | H1 "Crear tu cuenta" + campo Email con foco |
| 2 — después | Contraseña y botón "Entrar" (único botón relleno oscuro) | Contraseñas y botón "Crear cuenta" (único botón relleno oscuro) |
| 3 — secundario | Subtítulo, aviso de sesión vencida, botón Mostrar/Ocultar | Línea "pcUpgradeAPP", explicación, ayuda de 8 caracteres, Mostrar/Ocultar |
| Regla | Una sola acción primaria por pantalla. Los errores rompen la jerarquía a propósito (van arriba del campo afectado o arriba del form) y se muestran solo cuando existen. | Idem |

## 1.3 Estados

| # | Estado | Pantalla | Disparador | Comportamiento | Texto exacto |
|---|---|---|---|---|---|
| E1 | Inicial vacío | ambas | carga de página | Foco en Email (`autofocus`). Sin errores visibles. Botón habilitado. | — |
| E2a | Validación: email vacío | ambas | submit | Error bajo el campo; borde del input 2 px error; `aria-invalid="true"`. Foco al primer campo con error. No se llama al servidor. Tras el primer submit, cada campo con error se revalida al salir del campo (blur) y el error desaparece apenas es válido. | "Ingresá tu email." |
| E2b | Validación: email con formato inválido | ambas | submit (regla: algo@algo.algo, sin espacios) | Igual a E2a | "Revisá el email: tiene que ser como nombre@dominio.com." |
| E2c | Validación: contraseña vacía | ambas | submit | Igual a E2a | "Ingresá tu contraseña." |
| E2d | Validación: menos de 8 caracteres | setup | submit | Reemplaza visualmente la ayuda "Mínimo 8 caracteres." por el error | "La contraseña tiene que tener al menos 8 caracteres." |
| E2e | Validación: repetir vacío | setup | submit | Igual a E2a | "Repetí la contraseña." |
| E2f | Validación: contraseñas distintas | setup | submit, con ambas no vacías | Error en "Repetir contraseña" | "Las contraseñas no coinciden." |
| E3 | Enviando | ambas | submit válido | Botón `disabled` + `aria-busy="true"`, texto cambia; inputs `readOnly`; un segundo submit (clic o Enter) se ignora. Ancho del botón no cambia. | Login: "Entrando…" · Setup: "Creando…" |
| E4 | Credenciales inválidas | login | `signInWithPassword` → `invalid_credentials` / 400 | Caja de error arriba del form, recibe foco. Se conserva el email, se vacía la contraseña. Mismo texto exista o no el email. | "Email o contraseña incorrectos." |
| E5 | Demasiados intentos | login (y setup en el paso de inicio de sesión) | 429 de Supabase | Caja de error, recibe foco. Botón queda habilitado. | "Demasiados intentos. Esperá unos minutos y probá de nuevo." |
| E6 | Sin conexión / error de red | ambas | `fetch` falla o `navigator.onLine === false` | Caja de error, recibe foco. Se conservan los datos (salvo contraseña en login). Reintento = el mismo botón primario, que vuelve a habilitarse; no se agrega un segundo botón. | "No pudimos conectarnos. Revisá tu conexión y probá de nuevo." |
| E7 | Configuración incompleta | ambas | servidor detecta `missing_env` (render o 500 `{error:"missing_env"}`) | Caja de error en lugar del form (o arriba con inputs y botón `disabled`). Nunca mostrar nombres de variables ni valores. | "La app todavía no está configurada. Falta completar la conexión con la base de datos en el archivo de entorno del servidor." |
| E8 | Alta cerrada (409) | setup | `POST /api/auth/setup` → 409 `setup_closed` | Caja de error con link; inputs y botón `disabled`. | "Ya existe una cuenta. " + link "Entrá con tu email." → `/login` |
| E9 | Alta ok | setup | 201 + `signInWithPassword` ok | **Sin mensaje intermedio.** Botón sigue en "Creando…" hasta navegar a `/` (`router.replace`, para que Atrás no vuelva al setup). | — |
| E9b | Alta ok pero falla el inicio de sesión | setup | 201 y luego error al entrar | Caja de error con link. | "Tu cuenta se creó, pero no pudimos iniciar sesión. " + link "Entrá con tu email." → `/login` |
| E10 | Sesión vencida | login | URL con `?expired=1` | Aviso informativo arriba del H1 (`role="status"`, no alert; no toma foco). Desaparece al enviar el form. | "Tu sesión venció. Entrá de nuevo." |
| E11 | Error inesperado | ambas | 400 de setup o cualquier 5xx no cubierto | Caja de error, recibe foco | "Algo falló de nuestro lado. Probá de nuevo en un rato." |

Notas: los mensajes nunca dependen solo del color (siempre texto + borde 2 px). Sin signos de exclamación. Cuando hay varios errores de validación se muestran todos a la vez, cada uno junto a su campo.

## 1.4 Textos

| Clave | Dónde | Texto |
|---|---|---|
| login.title | `/login` H1 | pcUpgradeAPP |
| login.subtitle | `/login` | Entrá con tu email y contraseña. |
| login.submit | botón | Entrar |
| login.submitting | botón E3 | Entrando… |
| login.setupNotice.title | aviso `open=true` (negrita) | Todavía no hay cuenta. |
| login.setupNotice.body | aviso `open=true` | Creá la cuenta del dueño para empezar a usar la app. |
| login.setupNotice.link | link-botón | Crear la cuenta del dueño |
| login.expired | aviso E10 | Tu sesión venció. Entrá de nuevo. |
| setup.eyebrow | `/setup` arriba del H1 | pcUpgradeAPP |
| setup.title | `/setup` H1 | Crear tu cuenta |
| setup.lead | `/setup` | Se crea una sola vez. Después el alta queda cerrada. |
| setup.submit | botón | Crear cuenta |
| setup.submitting | botón E3 | Creando… |
| field.email.label | ambas | Email |
| field.password.label | ambas | Contraseña |
| field.password.help | setup | Mínimo 8 caracteres. |
| field.passwordRepeat.label | setup | Repetir contraseña |
| toggle.show / toggle.hide | texto visible del botón | Mostrar / Ocultar |
| toggle.aria (Contraseña) | nombre accesible | Mostrar contraseña / Ocultar contraseña |
| toggle.aria (Repetir) | nombre accesible | Mostrar contraseña repetida / Ocultar contraseña repetida |
| err.email.empty | E2a | Ingresá tu email. |
| err.email.invalid | E2b | Revisá el email: tiene que ser como nombre@dominio.com. |
| err.password.empty | E2c | Ingresá tu contraseña. |
| err.password.short | E2d | La contraseña tiene que tener al menos 8 caracteres. |
| err.repeat.empty | E2e | Repetí la contraseña. |
| err.repeat.mismatch | E2f | Las contraseñas no coinciden. |
| err.credentials | E4 | Email o contraseña incorrectos. |
| err.rateLimit | E5 | Demasiados intentos. Esperá unos minutos y probá de nuevo. |
| err.network | E6 | No pudimos conectarnos. Revisá tu conexión y probá de nuevo. |
| err.config | E7 | La app todavía no está configurada. Falta completar la conexión con la base de datos en el archivo de entorno del servidor. |
| err.setupClosed + link | E8 | Ya existe una cuenta. / Entrá con tu email. |
| err.setupLoginFailed + link | E9b | Tu cuenta se creó, pero no pudimos iniciar sesión. / Entrá con tu email. |
| err.unexpected | E11 | Algo falló de nuestro lado. Probá de nuevo en un rato. |
| layout.signout | barra | Salir |
| meta.title.login / setup | `<title>` | Entrar · pcUpgradeAPP / Crear tu cuenta · pcUpgradeAPP |

Sin placeholders en ningún input (el label visible alcanza; un placeholder gris compite con el texto y suele fallar contraste).

## 1.5 Accesibilidad

| Requisito | Cómo se cumple (criterio de aceptación para VI) |
|---|---|
| Idioma | `<html lang="es-AR">` |
| Labels | `<label for>` visible arriba de cada input. Sin placeholders. |
| Autocomplete / tipos | Login: Email `type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false"`; Contraseña `type="password" autocomplete="current-password"`. Setup: Email igual; Contraseña y Repetir `autocomplete="new-password"`. |
| Errores de campo | Texto con `id` propio; input con `aria-invalid="true"` y `aria-describedby` = id del error (+ id de la ayuda en setup). Al corregir: `aria-invalid` se quita. |
| Errores del servidor | Caja única arriba del form con `role="alert"` y `tabindex="-1"`; al aparecer recibe el foco. Aviso E10 con `role="status"`. |
| Foco tras validación cliente | Al primer campo con error (su error se lee por `aria-describedby`). |
| Foco visible | Todo elemento interactivo: `outline: 3px solid #1a56db; outline-offset: 2px` en `:focus-visible`. Nunca `outline: none` sin reemplazo. |
| Envío | `<form>` real: Enter en cualquier campo envía. Botón primario `type="submit"`; Mostrar/Ocultar `type="button"` (no envía). |
| Mostrar/Ocultar | Botón dentro del área del campo, a la derecha, texto visible "Mostrar"/"Ocultar" + `aria-label` que cambia (ver 1.4) + `aria-controls` = id del input. Al alternar, el foco queda en el botón y el valor no se pierde. Área táctil 44×44 px. |
| Orden de Tab | Login: Email → Contraseña → Mostrar → Entrar. Setup: Email → Contraseña → Mostrar → Repetir → Mostrar → Crear cuenta. Con sesión, la barra va primero: "pcUpgradeAPP" → Salir. |
| Áreas táctiles | Inputs 48 px de alto; botones primarios 48 px; "Salir", Mostrar/Ocultar y link-botón ≥ 44×44 px. |
| Contraste | Ver tabla 1.7: todo texto ≥ 4.5:1; borde de input y foco ≥ 3:1 (WCAG 1.4.11). |
| Estado ocupado | Botón en E3 con `aria-busy="true"`; el cambio de texto lo anuncia el propio botón con foco. |
| Zoom | Al 200 % y a 320 px de ancho no hay scroll horizontal ni texto cortado. |

## 1.6 Responsive

| Medida | 360 px (celular) | 768 px (tablet) | 1280 px (escritorio) |
|---|---|---|---|
| Ancho de tarjeta | 100 % − márgenes (= 328 px) | 400 px, centrada | 400 px, centrada |
| Margen lateral de página | 16 px | auto (centrado) | auto (centrado) |
| Margen superior de la tarjeta | 24 px | 64 px | 96 px |
| Padding de tarjeta | 20 px | 32 px | 32 px |
| Borde / radio de tarjeta | 1 px `#dddddd`, radio 8 px | igual | igual |
| H1 | 24 px / 1.25 | 28 px / 1.25 | 28 px / 1.25 |
| Texto, labels, inputs, botones | 16 px (inputs nunca < 16 px: evita el zoom de iOS) | 16 px | 16 px |
| Errores, ayudas, email en barra | 14 px / 1.4 | 14 px | 14 px |
| Separación entre campos | 16 px | 20 px | 20 px |
| Barra "Salir" | padding lateral 16 px; email oculto (< 480 px) | padding 24 px; email visible | padding 32 px; email visible |

Reglas en todos los anchos:
- Cero scroll horizontal: tarjeta con `max-width: 100%`, textos con `overflow-wrap: anywhere` (errores y emails largos bajan de línea, no se truncan).
- La tarjeta va alineada arriba, **no centrada verticalmente**. Fondo de página `#f7f7f7` con `min-height: 100dvh` (no `100vh`).
- Teclado virtual abierto: sin elementos `fixed`/`sticky` en estas pantallas; el botón queda en el flujo debajo de los campos y se alcanza con scroll normal. El campo enfocado lo lleva a la vista el navegador; no forzar `scrollIntoView` salvo para la caja de error al recibir foco.
- Botones primarios a ancho completo de la tarjeta en los tres anchos.

## 1.7 Tokens

| Token | Valor | Uso | Contraste calculado (WCAG 2.x) |
|---|---|---|---|
| font.family | Arial, Helvetica, sans-serif | todo | — |
| color.bg | `#f7f7f7` | fondo de página, aviso informativo | — |
| color.surface | `#ffffff` | tarjeta, inputs, barra | — |
| color.text | `#222222` | texto principal, labels | 15.9:1 sobre `#ffffff` · 14.8:1 sobre `#f7f7f7` |
| color.textMuted | `#555555` | subtítulo, ayuda, email en barra | 7.5:1 sobre `#ffffff` · 7.0:1 sobre `#f7f7f7` |
| color.border | `#dddddd` | borde de tarjeta y barra (decorativo) | 1.36:1 — **solo decorativo**, no sirve para delimitar inputs |
| color.borderSubtle | `#eeeeee` | separadores internos si hacen falta | decorativo |
| color.inputBorder | `#767676` | borde 1 px de inputs | 4.5:1 sobre `#ffffff` · 4.2:1 sobre `#f7f7f7` (≥ 3:1 ok) |
| color.primary / onPrimary | `#222222` / `#ffffff` | botón primario y link-botón | 15.9:1 |
| color.primaryDisabled | `#555555` con texto `#ffffff` | botón en E3 / deshabilitado | 7.5:1 (se mantiene legible) |
| color.error | `#b00020` | texto de error de campo, borde 2 px de input inválido, borde izquierdo 4 px de la caja de error | 7.3:1 sobre `#ffffff` · 6.8:1 sobre `#f7f7f7` |
| color.focus | `#1a56db` | outline de foco 3 px, links de texto (subrayados) | 6.2:1 sobre `#ffffff` · 5.8:1 sobre `#f7f7f7` |
| radius.sm / md | 6 px / 8 px | inputs y botones / tarjeta y cajas | — |
| space | 4 · 8 · 12 · 16 · 20 · 24 · 32 px | únicos valores de espaciado | — |
| size.control | 48 px alto (inputs, botón primario); 44 px mínimo (resto) | — | — |
| font.size | 14 · 16 · 24 · 28 px; negrita solo en H1, labels y título de aviso | — | — |

Cajas: error = fondo `#ffffff`, borde 1 px `#dddddd` + borde izquierdo 4 px `#b00020`, texto `#222222`. Aviso informativo (E10, setup abierto) = fondo `#f7f7f7`, borde 1 px `#dddddd`, texto `#222222`.

Cálculo: luminancia relativa sRGB (WCAG 2.x), ratio = (L1 + 0.05) / (L2 + 0.05). Luminancias usadas: `#ffffff` 1.000 · `#f7f7f7` 0.930 · `#dddddd` 0.723 · `#767676` 0.181 · `#555555` 0.091 · `#1a56db` 0.120 · `#b00020` 0.093 · `#222222` 0.016. Calculados a mano; VI los confirma en el caso 27.

---

## Desvíos respecto del lenguaje aprobado (para LUX)
- Agrego `#767676` para bordes de input: `#dddddd` sobre blanco da 1.36:1 y no cumple 3:1 para delimitar controles. `#dddddd` queda para la tarjeta y la barra.
- Agrego `#555555` (texto secundario), `#b00020` (error) y `#1a56db` (foco/links), pedidos por la tarea.

## Pendientes fuera de alcance
- "Olvidé mi contraseña" (mientras tanto, reset desde el panel de Supabase).
- Registro abierto / "Crear cuenta" en `/login`.
- Magic link.

## Necesita ojo humano
- Confirmar la decisión de reemplazar el formulario de login por el aviso cuando `open=true`.
- Revisión visual real en los 3 anchos cuando EZREAL lo construya (esta spec no se verificó en navegador: todavía no hay pantallas).
