import { adapters } from "@/lib/stores";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) {
    return Response.json(
      { ok: false, error: "missing_query", hint: "usar ?q=rtx%203060" },
      { status: 400 },
    );
  }
  const stores = await Promise.all(adapters.map((a) => a.searchPrices(q)));
  return Response.json({
    q,
    ranAt: new Date().toISOString(),
    stores,
  });
}
