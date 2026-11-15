import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST desde el botón "Salir" del layout. 303 para que el navegador siga con GET a /login.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Sin variables o sin red: igual se manda a /login; el proxy no deja pasar sin usuario válido.
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
