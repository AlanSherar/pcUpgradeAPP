// Tipos compartidos de los adaptadores de tienda (plan v2 §3.3).

export type PriceKind = "cash" | "special" | "list" | "installments" | "unspecified";

export interface StoreItem {
  title: string;
  priceArs: number;
  listPriceArs?: number;
  priceKind: PriceKind;
  url: string;
  inStock?: boolean;
}

export interface StoreResult {
  store: string;
  url: string;
  httpStatus: number | null;
  ok: boolean;
  method: "direct_fetch";
  items: StoreItem[];
  error: string | null;
  ms: number;
}

// Interfaz del plan: searchPrices(query) -> Snapshot[]. Acá devuelve el resultado
// completo de la tienda (status HTTP, error, ms) y los "snapshots" son result.items.
export interface StoreAdapter {
  id: string;
  buildUrl(query: string): string;
  searchPrices(query: string): Promise<StoreResult>;
}
