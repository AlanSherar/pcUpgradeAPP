import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePublicEnv } from "./env";

// Cliente de servidor con la sesión del usuario (cookies).
// Para Server Components, Route Handlers y Server Actions.
// Lanza `missing_env: <nombre>` si faltan variables.
export async function createClient() {
  const { url, anonKey } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Desde un Server Component no se pueden escribir cookies.
          // El proxy refresca la sesión, así que se puede ignorar.
        }
      },
    },
  });
}
