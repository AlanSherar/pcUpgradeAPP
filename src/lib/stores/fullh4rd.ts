import { makeAdapter } from "./factory";

// URL de búsqueda observada en el índice de buscadores: /cat/search/<consulta>.
// Con fetch simple puede dar 403 (plan v2 §3.1); se reporta tal cual como http_403.
export const fullh4rd = makeAdapter({
  id: "fullh4rd",
  buildUrl: (q) => `https://fullh4rd.com.ar/cat/search/${encodeURIComponent(q)}`,
  kindFor: (text) => (/precio\s+especial/i.test(text) ? "special" : "unspecified"),
  emptyError: "no_items_parsed",
});
