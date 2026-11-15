// Diagnóstico de claves. No consume créditos:
// - Anthropic: GET /v1/models (solo lista modelos, no genera tokens).
// - Supabase: un SELECT de 1 fila con la service role key.
// Nunca devuelve el valor de una clave, solo si existe y si el servicio la acepta.
export const dynamic = "force-dynamic";

async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { present: false };
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    return { present: true, status: res.status, ok: res.ok };
  } catch (e) {
    return { present: true, ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function checkSupabaseServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return { present: false };
  if (!url) return { present: true, ok: false, error: "NEXT_PUBLIC_SUPABASE_URL missing" };
  const kind = key.startsWith("sb_secret_") ? "sb_secret" : key.startsWith("eyJ") ? "legacy_jwt" : "unknown";
  const headers: Record<string, string> = { apikey: key };
  if (kind === "legacy_jwt") headers.Authorization = `Bearer ${key}`;
  try {
    const res = await fetch(`${url}/rest/v1/sale_calendar?select=id&limit=1`, {
      headers,
      cache: "no-store",
    });
    let rows: number | null = null;
    if (res.ok) {
      const body = await res.json();
      rows = Array.isArray(body) ? body.length : null;
    }
    return { present: true, kind, status: res.status, ok: res.ok, rows };
  } catch (e) {
    return { present: true, kind, ok: false, error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function GET() {
  const [anthropic, supabaseServiceRole] = await Promise.all([
    checkAnthropic(),
    checkSupabaseServiceRole(),
  ]);
  return Response.json({ anthropic, supabaseServiceRole, time: new Date().toISOString() });
}
