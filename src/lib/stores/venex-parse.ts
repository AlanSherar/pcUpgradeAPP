// Extractor específico de Venex. Autocontenido a propósito (solo imports de tipo) para poder
// correrlo con `node` sin bundler (scripts/parse-sample.mjs).
//
// Estructura observada en docs/samples/venex_rtx3060.html y en el listado en vivo:
//   div.item[.item-no-stock] > div.product-box            <- una por producto
//     h3.product-box-title a[href][onclick=enhancedClick({... "price":"934999" ...})]
//     a.product-box-price span.current-price              <- "$ 494.999" (solo con stock)
//     a.product-box-price span.label-no-stock             <- "Sin stock" (sin precio visible)
//     p.product-box-payment                               <- "Contado efectivo" (sin stock)
// Sin stock no hay precio visible: se toma del JSON de enhancedClick ("price").
// La página viene en ISO-8859-1; la decodificación la hace fetchHtml (http.ts) con el <meta>.

import * as cheerio from "cheerio";
import type { PriceKind, StoreItem } from "./types";

export interface VenexExtract {
  items: StoreItem[];
  cardsSeen: number;
}

function norm(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// "$ 494.999" / "$ 1.234.567,00" -> entero en pesos. 0 si no hay número.
function pesos(text: string): number {
  const noDecimals = text.replace(/,\d{1,2}\s*$/, "");
  const n = Number(noDecimals.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function queryMatches(title: string, query: string): boolean {
  const hay = fold(title);
  return fold(query)
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .every((t) => hay.includes(t));
}

export function extractVenexCards(
  html: string,
  baseUrl: string,
  query: string,
  kindFor: (cardText: string) => PriceKind,
  max = 5,
): VenexExtract {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const found: StoreItem[] = [];
  let cardsSeen = 0;

  for (const el of $(".product-box").toArray()) {
    const card = $(el);
    const titleLink = card.find("h3.product-box-title a[href]").first();
    const title = norm(titleLink.text());
    if (!title) continue;

    // Precio: visible si hay stock; si no, el del JSON de enhancedClick.
    let priceArs = pesos(card.find(".current-price").first().text());
    if (priceArs <= 0) {
      const m = /"price"\s*:\s*"(\d+)"/.exec(titleLink.attr("onclick") ?? "");
      priceArs = m ? Number(m[1]) : 0;
    }
    if (priceArs <= 0) continue;
    cardsSeen++;
    if (!queryMatches(title, query)) continue;

    let url: string;
    try {
      const u = new URL(titleLink.attr("href") ?? "", baseUrl);
      u.search = ""; // "?keywords=..." es solo tracking de la búsqueda
      u.hash = "";
      url = u.toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    const noStock =
      card.closest(".item").hasClass("item-no-stock") ||
      card.find(".label-no-stock").length > 0 ||
      /sin stock/i.test(card.find(".product-box-price").text());
    const inStock = !noStock;

    found.push({
      title,
      priceArs,
      priceKind: kindFor(norm(card.text())),
      url,
      inStock,
    });
  }

  found.sort((x, y) => {
    const sx = x.inStock === false ? 1 : 0;
    const sy = y.inStock === false ? 1 : 0;
    return sx - sy || x.priceArs - y.priceArs;
  });
  return { items: found.slice(0, max), cardsSeen };
}
