// fetch directo con User-Agent de navegador, timeout y decodificación de charset.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export interface FetchedHtml {
  status: number;
  html: string;
}

function pickCharset(contentType: string | null, head: string): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType ?? "");
  if (fromHeader) return fromHeader[1].toLowerCase();
  const fromMeta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  if (fromMeta) return fromMeta[1].toLowerCase();
  return "utf-8";
}

function decode(buf: ArrayBuffer, charset: string): string {
  try {
    return new TextDecoder(charset).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

export async function fetchHtml(url: string, timeoutMs = 15000): Promise<FetchedHtml> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "es-AR,es;q=0.9",
    },
    redirect: "follow",
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const buf = await res.arrayBuffer();
  const head = new TextDecoder("latin1").decode(buf.slice(0, 2048));
  let charset = pickCharset(res.headers.get("content-type"), head);
  let html = decode(buf, charset);
  // Si se declaró utf-8 pero el contenido es latin1 (caracteres de reemplazo), reintentar.
  if (charset === "utf-8" && html.includes("\uFFFD")) {
    charset = "windows-1252";
    html = decode(buf, charset);
  }
  return { status: res.status, html };
}

// Marcas de la página de desafío de Cloudflare ("Just a moment..."). Se mira solo el HTML.
// "cdn-cgi/challenge-platform" por sí solo NO cuenta: las páginas válidas protegidas por
// Cloudflare también cargan ese script. Solo es desafío con `_cf_chl_opt` o el título.
export function isCloudflareChallenge(html: string): boolean {
  return html.includes("_cf_chl_opt") || /<title>\s*Just a moment/i.test(html);
}
