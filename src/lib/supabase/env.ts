// Variables públicas de Supabase (seguras para el navegador).
// Los nombres se escriben literales para que Next las inyecte en el bundle del cliente.

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`missing_env: ${name}`);
    this.name = "MissingEnvError";
  }
}

export type PublicEnv = { url: string; anonKey: string };

/** Devuelve las variables públicas o null si falta alguna. */
export function getPublicEnv(): PublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/** Igual que getPublicEnv, pero lanza `missing_env: <nombre>` si falta alguna. */
export function requirePublicEnv(): PublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new MissingEnvError("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) throw new MissingEnvError("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anonKey };
}
