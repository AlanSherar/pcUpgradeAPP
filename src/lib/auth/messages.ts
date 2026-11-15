// Textos visibles de /login y /setup. Fuente: docs/specs/T-008_login_spec.md §1.3/§1.4 (SERAPHINE).
// Voseo, sin signos de exclamación. passwordLong y weakPassword no están en la spec: son casos
// extra del servidor (límite bcrypt y política de Supabase), redactados con el mismo tono.

import { PASSWORD_MIN } from "./validate";

export const TEXT = {
  appName: "pcUpgradeAPP",
  loginSubtitle: "Entrá con tu email y contraseña.",
  loginSubmit: "Entrar",
  loginSubmitting: "Entrando…",
  setupTitle: "Crear tu cuenta",
  setupSubtitle: "Se crea una sola vez. Después el alta queda cerrada.",
  setupSubmit: "Crear cuenta",
  setupSubmitting: "Creando…",

  emailLabel: "Email",
  passwordLabel: "Contraseña",
  confirmLabel: "Repetir contraseña",
  passwordHint: `Mínimo ${PASSWORD_MIN} caracteres.`,
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  showConfirm: "Mostrar contraseña repetida",
  hideConfirm: "Ocultar contraseña repetida",
  show: "Mostrar",
  hide: "Ocultar",

  // Validación de cliente
  emailRequired: "Ingresá tu email.",
  emailInvalid: "Revisá el email: tiene que ser como nombre@dominio.com.",
  passwordRequired: "Ingresá tu contraseña.",
  passwordShort: `La contraseña tiene que tener al menos ${PASSWORD_MIN} caracteres.`,
  passwordLong: "La contraseña puede tener como máximo 72 caracteres.",
  confirmRequired: "Repetí la contraseña.",
  confirmMismatch: "Las contraseñas no coinciden.",

  // Servidor / red
  invalidCredentials: "Email o contraseña incorrectos.",
  tooManyAttempts: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
  network: "No pudimos conectarnos. Revisá tu conexión y probá de nuevo.",
  unexpected: "Algo falló de nuestro lado. Probá de nuevo en un rato.",
  configMissing:
    "La app todavía no está configurada. Falta completar la conexión con la base de datos en el archivo de entorno del servidor.",
  weakPassword: "La contraseña es demasiado débil. Probá con una más larga o con más variedad de caracteres.",

  // Avisos
  setupOpenNotice: "Todavía no hay cuenta.",
  setupOpenBody: "Creá la cuenta del dueño para empezar a usar la app.",
  setupOpenLink: "Crear la cuenta del dueño",
  setupClosed: "Ya existe una cuenta.",
  goToLogin: "Entrá con tu email.",
  createdButNoSession: "Tu cuenta se creó, pero no pudimos iniciar sesión.",
  sessionExpired: "Tu sesión venció. Entrá de nuevo.",

  signOut: "Salir",
} as const;

type AuthErrorLike = { status?: number; name?: string; code?: string };

/** Traduce un error de signInWithPassword a un texto que no revela si el email existe. */
export function signInErrorMessage(error: AuthErrorLike): string {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  if (offline) return TEXT.network;
  if (error.name === "AuthRetryableFetchError" && !error.status) return TEXT.network;
  if (error.status === 429 || error.code === "over_request_rate_limit") return TEXT.tooManyAttempts;
  if (typeof error.status === "number" && error.status >= 500) return TEXT.unexpected;
  return TEXT.invalidCredentials;
}
