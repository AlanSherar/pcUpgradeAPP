// Alta del dueño (T-008). Única cuenta de la app: abierta solo mientras Auth tenga 0 usuarios.
// Usa la service role vía src/lib/supabase/admin.ts. Nunca loguea ni devuelve la contraseña.
import { createAdminClient, getSetupStatus } from "@/lib/supabase/admin";
import { MissingEnvError } from "@/lib/supabase/env";
import { isValidEmail, isValidNewPassword } from "@/lib/auth/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: noStore });
}

export async function GET() {
  const status = await getSetupStatus();
  if (status === "missing_env") return json({ error: "missing_env" }, 500);
  if (status === "error") return json({ error: "auth_unavailable" }, 502);
  return json({ open: status === "open" }, 200);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid_body" }, 400);
  }

  const { email, password } = (payload ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== "string" || typeof password !== "string") {
    return json({ error: "invalid_body" }, 400);
  }
  const cleanEmail = email.trim();
  if (!isValidEmail(cleanEmail)) return json({ error: "invalid_email" }, 400);
  if (!isValidNewPassword(password)) return json({ error: "invalid_password" }, 400);

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    if (err instanceof MissingEnvError) return json({ error: "missing_env" }, 500);
    return json({ error: "auth_unavailable" }, 502);
  }

  try {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (list.error) return json({ error: "auth_unavailable" }, 502);
    if (list.data.users.length > 0) return json({ error: "setup_closed" }, 409);
  } catch {
    return json({ error: "auth_unavailable" }, 502);
  }

  let created;
  try {
    created = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    });
  } catch {
    return json({ error: "auth_unavailable" }, 502);
  }
  if (created.error) {
    if (created.error.code === "weak_password") return json({ error: "weak_password" }, 400);
    if (created.error.code === "email_exists") return json({ error: "setup_closed" }, 409);
    console.error("[auth/setup] createUser falló:", created.error.status, created.error.code);
    return json({ error: "auth_unavailable" }, 502);
  }

  return json({ ok: true }, 201);
}
