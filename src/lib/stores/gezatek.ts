import { makeAdapter } from "./factory";
import { extractGezatekCards } from "./gezatek-parse";
import { extractItems } from "./parse";
import type { PriceKind } from "./types";

// URL de búsqueda observada en el índice de buscadores: /buscar/?q=<consulta>.
export const gezatekKindFor = (text: string): PriceKind =>
  /precio\s+geza/i.test(text) ? "special" : "unspecified";

export const gezatek = makeAdapter({
  id: "gezatek",
  buildUrl: (q) => `https://gezatek.com.ar/buscar/?q=${encodeURIComponent(q)}`,
  kindFor: gezatekKindFor,
  emptyError: "no_items_parsed",
  // Extractor por data-* de las tarjetas; si la plataforma cambia el markup y no hay
  // tarjetas, cae al extractor heurístico genérico.
  extract: (html, url, query, kindFor, max) => {
    const r = extractGezatekCards(html, url, query, kindFor, max);
    return r.cardsSeen > 0 ? r : extractItems(html, url, query, kindFor, max);
  },
});
