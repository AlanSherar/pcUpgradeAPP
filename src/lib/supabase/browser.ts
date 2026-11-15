import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "./env";

// Cliente de navegador: solo usa la URL y la anon key (públicas).
export function createClient() {
  const { url, anonKey } = requirePublicEnv();
  return createBrowserClient(url, anonKey);
}
