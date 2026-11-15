// Solo se usa desde componentes cliente (login-form, setup-form).
import { createClient } from "@/lib/supabase/browser";
import { signInErrorMessage, TEXT } from "./messages";

/** Inicia sesión desde el navegador. Devuelve null si salió bien, o el texto de error a mostrar. */
export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return TEXT.configMissing;
  }
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? signInErrorMessage(error) : null;
  } catch {
    return TEXT.network;
  }
}
