// SOLO SERVIDOR. Usa SUPABASE_SERVICE_ROLE_KEY, que nunca debe llegar al navegador.
// No importar desde componentes con "use client".
// `server-only` no está instalado: se usa el chequeo equivalente de abajo.
import { createClient } from "@supabase/supabase-js";
import { MissingEnvError } from "./env";

if (typeof window !== "undefined") {
  throw new Error("src/lib/supabase/admin.ts es solo de servidor");
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new MissingEnvError("NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceKey) throw new MissingEnvError("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type SetupStatus = "open" | "closed" | "missing_env" | "error";

/**
 * El alta del dueño está abierta solo si Auth tiene 0 usuarios.
 * Solo lectura (listUsers con perPage 1). La usan la ruta de setup y las páginas /login y /setup.
 */
export async function getSetupStatus(): Promise<SetupStatus> {
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    if (err instanceof MissingEnvError) return "missing_env";
    return "error";
  }
  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) return "error";
    return data.users.length === 0 ? "open" : "closed";
  } catch {
    return "error";
  }
}
