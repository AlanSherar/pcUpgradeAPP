// Evita open redirect: solo rutas internas ("/algo"), nunca "//host" ni "/\host".
export function safeNext(value: string | string[] | null | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || typeof raw !== "string") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  // Caracteres de control o barras invertidas: el navegador puede normalizarlos a "//".
  if (raw.includes("\\")) return "/";
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) < 0x20) return "/";
  }
  return raw;
}
