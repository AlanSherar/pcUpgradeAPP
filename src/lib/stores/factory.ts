import { fetchHtml, isCloudflareChallenge } from "./http";
import { extractItems } from "./parse";
import type { ExtractResult } from "./parse";
import type { PriceKind, StoreAdapter, StoreResult } from "./types";

interface AdapterConfig {
  id: string;
  buildUrl: (query: string) => string;
  kindFor: (cardText: string) => PriceKind;
  // Error a reportar cuando responde 200 pero no hay productos parseables.
  emptyError: "requires_js" | "no_items_parsed";
  // Extractor propio de la tienda; si no se da, se usa el heurístico genérico.
  extract?: (
    html: string,
    baseUrl: string,
    query: string,
    kindFor: (cardText: string) => PriceKind,
    max?: number,
  ) => ExtractResult;
}

export function makeAdapter(cfg: AdapterConfig): StoreAdapter {
  return {
    id: cfg.id,
    buildUrl: cfg.buildUrl,
    async searchPrices(query: string): Promise<StoreResult> {
      const url = cfg.buildUrl(query);
      const started = Date.now();
      const base: StoreResult = {
        store: cfg.id,
        url,
        httpStatus: null,
        ok: false,
        method: "direct_fetch",
        items: [],
        error: null,
        ms: 0,
      };
      try {
        const { status, html } = await fetchHtml(url);
        base.httpStatus = status;
        if (isCloudflareChallenge(html)) {
          // Se chequea antes que el status: el desafío puede venir con 200, 403 o 503.
          base.error = "cloudflare_challenge";
        } else if (status < 200 || status >= 300) {
          base.error = `http_${status}`;
        } else {
          const extract = cfg.extract ?? extractItems;
          const { items, cardsSeen } = extract(html, url, query, cfg.kindFor);
          base.items = items;
          if (items.length > 0) {
            base.ok = true;
          } else if (cardsSeen > 0) {
            base.error = "no_relevant_items";
          } else {
            base.error = cfg.emptyError;
          }
        }
      } catch (err) {
        const name = err instanceof Error ? err.name : "Error";
        base.error =
          name === "TimeoutError" || name === "AbortError"
            ? "timeout"
            : `fetch_failed: ${err instanceof Error ? err.message : String(err)}`;
      }
      base.ms = Date.now() - started;
      return base;
    },
  };
}
