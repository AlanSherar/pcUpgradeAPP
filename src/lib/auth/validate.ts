// Reglas de validación compartidas entre los formularios (cliente) y la ruta de setup (servidor).

export const PASSWORD_MIN = 8;
// Supabase Auth guarda la contraseña con bcrypt, que solo usa los primeros 72 bytes.
export const PASSWORD_MAX = 72;

// Formato básico nombre@dominio.tld, sin espacios. La validación real la hace Supabase.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function isValidNewPassword(value: string): boolean {
  return value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX;
}
