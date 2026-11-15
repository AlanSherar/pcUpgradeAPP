// Extractor específico de Gezatek (plataforma Qloud). Lee los atributos data-* de cada
// tarjeta ".prod-cat" en vez de adivinar por links. Autocontenido a propósito: solo imports
// de tipo (se borran al compilar) para poder correrlo con `node` sin bundler (scripts/parse-sample.mjs).

import * as cheerio from "cheerio";
import type { PriceKind, StoreItem } from "./types";

export interface GezatekExtract {
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

// "849990" / "$934989" / "$ 934.989,00" -> entero en pesos. 0 si no hay número.
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

// Estructura observada en docs/samples/gezatek_rtx3060.html:
//   div.prod-cat[data-id][data-nombre][data-precio]   <- una por producto
//     h6.card-category  .et                           <- "En stock"
//     h4.card-title a[href]                           <- url absoluta del producto
//     .price h6.precio_mp                             <- precio de lista (tachado/oculto)
//     .price h4.pecio_final b                         <- precio final ("Precio Geza")
export function extractGezatekCards(
  html: string,
  baseUrl: string,
  query: string,
  kindFor: (cardText: string) => PriceKind,
  max = 5,
): GezatekExtract {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const found: StoreItem[] = [];
  let cardsSeen = 0;

  for (const el of $(".prod-cat[data-nombre][data-precio]").toArray()) {
    const card = $(el);
    const title = norm(card.attr("data-nombre") ?? "");
    const priceArs = pesos(card.attr("data-precio") ?? "");
    if (!title || priceArs <= 0) continue;
    cardsSeen++;
    if (!queryMatches(title, query)) continue;

    const href =
      card.find("h4.card-title a[href]").first().attr("href") ??
      card.find("a[href]").first().attr("href") ??
      "";
    let url: string;
    try {
      const u = new URL(href, baseUrl);
      u.hash = "";
      url = u.toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;
    seen.add(url);

    const listPrice = pesos(card.find(".precio_mp").first().text());
    const stockText = norm(card.find(".card-category .et").first().text());
    let inStock: boolean | undefined;
    if (/sin stock|agotad|no disponible/i.test(stockText)) inStock = false;
    else if (/en stock|disponible/i.test(stockText)) inStock = true;

    found.push({
      title,
      priceArs,
      ...(listPrice > priceArs ? { listPriceArs: listPrice } : {}),
      priceKind: kindFor(norm(card.text())),
      url,
      ...(inStock === undefined ? {} : { inStock }),
    });
  }

  found.sort((x, y) => {
    const sx = x.inStock === false ? 1 : 0;
    const sy = y.inStock === false ? 1 : 0;
    return sx - sy || x.priceArs - y.priceArs;
  });
  return { items: found.slice(0, max), cardsSeen };
}
