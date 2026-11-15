// Prueba offline de los parsers, sin servidor ni red.
// Uso (desde la raíz del repo):
//   node scripts/parse-sample.mjs [archivo.html] [consulta] [gezatek|venex]
//   MIN_ITEMS=3 node scripts/parse-sample.mjs docs/samples/gezatek_placas.html "placa de video"
//   node scripts/parse-sample.mjs docs/samples/venex_rtx3060.html "rtx 3060"
// Por defecto: docs/samples/gezatek_rtx3060.html y "rtx 3060". La tienda (3er argumento) se
// deduce del nombre del archivo si no se indica. MIN_ITEMS (env, default 1) = mínimo de
// ítems que debe devolver el parser.
// El archivo se decodifica con el charset de su <meta> (Venex es ISO-8859-1), igual que http.ts.
// Requiere Node >= 22.18 (ejecuta .ts directamente). Sale con código 1 si falla algún chequeo.

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { extractGezatekCards } from "../src/lib/stores/gezatek-parse.ts";
import { extractVenexCards } from "../src/lib/stores/venex-parse.ts";
import { isCloudflareChallenge } from "../src/lib/stores/http.ts";

const file = resolve(process.argv[2] ?? "docs/samples/gezatek_rtx3060.html");
const query = process.argv[3] ?? "rtx 3060";
const store = (process.argv[4] ?? (/venex/i.test(basename(file)) ? "venex" : "gezatek")).toLowerCase();
const MIN_ITEMS = Number(process.env.MIN_ITEMS ?? 1);

const STORES = {
  gezatek: {
    label: "Gezatek",
    extract: extractGezatekCards,
    baseUrl: "https://gezatek.com.ar/buscar/",
    urlPrefix: "https://gezatek.com.ar/",
    // Misma regla que gezatekKindFor en src/lib/stores/gezatek.ts.
    kindFor: (text) => (/precio\s+geza/i.test(text) ? "special" : "unspecified"),
  },
  venex: {
    label: "Venex",
    extract: extractVenexCards,
    baseUrl: "https://www.venex.com.ar/resultado-busqueda.htm",
    urlPrefix: "https://www.venex.com.ar/",
    // Misma regla que venexKindFor en src/lib/stores/venex.ts.
    kindFor: (text) => (/contado\s+efectivo|precio\s+en\s+un\s+pago/i.test(text) ? "cash" : "unspecified"),
  },
};
const cfg = STORES[store];
if (!cfg) {
  console.error(`Tienda desconocida "${store}". Usá: ${Object.keys(STORES).join(" | ")}`);
  process.exit(2);
}

// Decodifica con el charset declarado en el <meta> (o utf-8).
function decodeHtml(buf) {
  const head = new TextDecoder("latin1").decode(buf.subarray(0, 2048));
  const m = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head);
  const charset = (m ? m[1] : "utf-8").toLowerCase();
  try {
    return { html: new TextDecoder(charset).decode(buf), charset };
  } catch {
    return { html: new TextDecoder("utf-8").decode(buf), charset: "utf-8 (fallback)" };
  }
}

const { html, charset } = decodeHtml(readFileSync(file));
const failures = [];

console.log(`Archivo : ${file} (${Math.round(html.length / 1024)} KB, charset ${charset})`);
console.log(`Consulta: "${query}"  Tienda: ${cfg.label}`);

// 1) Parser de la tienda sobre el HTML real.
const { items, cardsSeen } = cfg.extract(html, cfg.baseUrl, query, cfg.kindFor, 5);
console.log(`\n${cfg.label}: ${cardsSeen} tarjeta(s) en la página, ${items.length} ítem(s) devueltos`);
items.forEach((it, i) => {
  console.log(
    `  ${i + 1}. ${it.title}\n     final $${it.priceArs}` +
      (it.listPriceArs ? ` | lista $${it.listPriceArs}` : "") +
      ` | ${it.priceKind} | stock=${it.inStock ?? "?"}\n     ${it.url}`,
  );
});
if (items.length < MIN_ITEMS) failures.push(`ítems ${items.length} < MIN_ITEMS ${MIN_ITEMS}`);
for (const it of items) {
  if (!(it.priceArs > 0)) failures.push(`precio inválido en "${it.title}"`);
  if (!it.url.startsWith(cfg.urlPrefix)) failures.push(`url inesperada: ${it.url}`);
  if (/[\uFFFD]|Ã./.test(it.title)) failures.push(`título con caracteres rotos: "${it.title}"`);
}
if (store === "venex") {
  for (const it of items) {
    if (it.priceKind !== "cash") failures.push(`priceKind != cash en "${it.title}"`);
  }
}

// 2) Detección de desafío Cloudflare (muestras sintéticas con las marcas de la spec).
const cfSamples = {
  "_cf_chl_opt": "<html><script>window._cf_chl_opt={}</script></html>",
  "título Just a moment": "<html><head><title>Just a moment...</title></head></html>",
  "challenge-platform + título":
    '<html><head><title>Just a moment...</title></head><script src="/cdn-cgi/challenge-platform/h/b/orchestrate"></script></html>',
};
console.log("\nDetección Cloudflare:");
for (const [name, sample] of Object.entries(cfSamples)) {
  const ok = isCloudflareChallenge(sample);
  console.log(`  ${ok ? "OK  " : "FAIL"} ${name}`);
  if (!ok) failures.push(`no detecta ${name}`);
}
// Solo el script challenge-platform (como en páginas válidas) NO debe marcar desafío.
const lone = isCloudflareChallenge('<html><title>Tienda</title><script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script></html>');
console.log(`  ${lone ? "FAIL" : "OK  "} challenge-platform solo NO es desafío`);
if (lone) failures.push("challenge-platform solo marcado como desafío");
const falsePositive = isCloudflareChallenge(html);
console.log(`  ${falsePositive ? "FAIL" : "OK  "} el sample de ${cfg.label} NO es un desafío`);
if (falsePositive) failures.push(`falso positivo de Cloudflare en el sample de ${cfg.label}`);

console.log(failures.length ? `\nFALLÓ:\n- ${failures.join("\n- ")}` : "\nTODO OK");
process.exit(failures.length ? 1 : 0);
