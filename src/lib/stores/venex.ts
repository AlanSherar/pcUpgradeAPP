import { makeAdapter } from "./factory";
import { extractItems } from "./parse";
import type { PriceKind } from "./types";
import { extractVenexCards } from "./venex-parse";

// "Precio en un pago" / "Contado efectivo" es el precio final de Venex.
export const venexKindFor = (text: string): PriceKind =>
  /contado\s+efectivo|precio\s+en\s+un\s+pago/i.test(text) ? "cash" : "unspecified";

export const venex = makeAdapter({
  id: "venex",
  buildUrl: (q) =>
    `https://www.venex.com.ar/resultado-busqueda.htm?keywords=${encodeURIComponent(q)}&order=price_asc`,
  kindFor: venexKindFor,
  emptyError: "no_items_parsed",
  // Extractor por .product-box; si el markup cambia y no hay tarjetas, cae al heurístico.
  extract: (html, url, query, kindFor, max) => {
    const r = extractVenexCards(html, url, query, kindFor, max);
    return r.cardsSeen > 0 ? r : extractItems(html, url, query, kindFor, max);
  },
});
