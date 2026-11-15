# T-008 — Pruebas de VI (apptester)

Fecha: 2026-11-15 · Estado: **BLOQUEADO** (0 casos ejecutados)

## Qué pasó
No se pudo abrir `http://localhost:3000` con ninguna herramienta disponible. No hay resultados de casos: nada de lo de abajo fue probado.

| Intento | Resultado |
|---|---|
| `browser_test_navigate` url=http://localhost:3000/ serverId=nasus-dev | ERROR: "local test URL is not proven to belong to this agent's running background server". Exige un `serverId` de un servidor levantado por VI con shell en background; el dev server es de NASUS. `shell_bg_status` confirma que VI no tiene procesos en background. |
| `browser_navigate` | Rechaza localhost por diseño (ya lo anticipaba el pedido). |
| `web_fetch` http://localhost:3000/api/health | ERROR: "refusing to fetch private/loopback/intranet host". |
| `web_request` | BLOQUEADO por la corrida: la tarea vino de un chat con contenido externo en el contexto, así que se retiraron las herramientas de pedidos con credenciales. |
| `browser_attach` | No usada: exige un Chrome con puerto de depuración y perfil aparte preparado por el Commander. No hay ninguno declarado. |

## Tabla caso × ancho (360×800 / 768×1024 / 1280×800)

| Caso | 360 | 768 | 1280 |
|---|---|---|---|
| 1 redirect `/` → `/login?next=%2F` | NO PROBADO | NO PROBADO | NO PROBADO |
| 2 aviso "Todavía no hay cuenta" | NO PROBADO | NO PROBADO | NO PROBADO |
| 3 setup vacío | NO PROBADO | NO PROBADO | NO PROBADO |
| 4 email inválido | NO PROBADO | NO PROBADO | NO PROBADO |
| 5 contraseña de 7 caracteres | NO PROBADO | NO PROBADO | NO PROBADO |
| 6 contraseñas distintas | NO PROBADO | NO PROBADO | NO PROBADO |
| 12 email inexistente | NO PROBADO | NO PROBADO | NO PROBADO |
| 18 doble clic en Entrar | NO PROBADO | NO PROBADO | NO PROBADO |
| 19 sin red | NO PROBADO | NO PROBADO | NO PROBADO |
| 20 `/api/health` sin sesión | NO PROBADO | NO PROBADO | NO PROBADO |
| 21–27 accesibilidad y layout | NO PROBADO | NO PROBADO | NO PROBADO |
| 7–11, 13–17 | FUERA DE ALCANCE (sin usuario, por indicación) | | |

Pendiente de anotar cuando se pueda probar: qué muestran `/login` y `/setup` ante `missing_env` (debe ser "configuración incompleta" sin nombres de claves).

## Para destrabar (elegir una)
1. NASUS levanta el dev server desde el shell de VI (background) y pasa el id de proceso como `serverId`.
2. NASUS o el Commander corre Chrome con `--remote-debugging-port=<puerto> --user-data-dir=<carpeta aparte>` y VI usa `browser_attach`.
3. Nueva sesión sin contenido externo en el historial, para recuperar `web_request`. Solo cubriría los casos 9, 10 y 20 por HTTP; no la UI.
