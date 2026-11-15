import { makeAdapter } from "./factory";

// Compra Gamer carga el listado por JavaScript: con fetch directo se espera vacío.
// En ese caso se reporta ok:false, error:"requires_js" (no se inventan datos).
export const compragamer = makeAdapter({
  id: "compragamer",
  buildUrl: (q) => `https://compragamer.com/productos?criterio=${encodeURIComponent(q)}`,
  kindFor: () => "unspecified",
  emptyError: "requires_js",
});
