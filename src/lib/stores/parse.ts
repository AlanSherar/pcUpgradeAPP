// Extracción heurística de productos desde HTML de listados (sin IA).
// Estrategia: por cada link con texto largo, subir hasta el contenedor más chico
// que tenga un precio en pesos y un único producto; leer título y precios de ahí.

import * as cheerio from "cheerio";
import type { PriceKind, StoreItem } from "./types";

const PRICE_RE = /\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/g;
const INSTALLMENT_RE = /\b\d+\s*cuotas?\b[^$]{0,40}\$\s*[\d.,]+/gi;

export function norm(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// "$ 1.234.567,89" -> 1234567.89. Ignora montos < 1000 y los de "N cuotas de $x".
export function parsePricesAr(text: string): number[] {
  const clean = text.replace(INSTALLMENT_RE, " ");
  const out: number[] = [];
  for (const m of clean.matchAll(PRICE_RE)) {
    const int = Number(m[1].replace(/\./g, ""));
    const dec = m[2] ? Number("0." + m[2]) : 0;
    const value = int + dec;
    if (Number.isFinite(value) && value >= 1000) out.push(value);
  }
  return out;
}

export function queryMatches(title: string, query: string): boolean {
  const hay = fold(title);
  const tokens = fold(query)
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  return tokens.every((t) => hay.includes(t));
}

export interface ExtractResult {
  items: StoreItem[];
  cardsSeen: number;
}

export function extractItems(
  html: string,
  baseUrl: string,
  query: string,
  kindFor: (cardText: string) => PriceKind,
  max = 5,
): ExtractResult {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();

  const seen = new Set<string>();
  const found: StoreItem[] = [];
  let cardsSeen = 0;

  const anchors = $("a[href]").toArray().slice(0, 1500);
  for (const el of anchors) {
    const a = $(el);
    const href = a.attr("href") ?? "";
    if (!href || href.startsWith("#") || /^(javascript|mailto|tel):/i.test(href)) continue;

    const ownText = norm(a.attr("title") ?? a.text());
    if (ownText.length < 12) continue;

    let url: string;
    try {
      const u = new URL(href, baseUrl);
      u.hash = "";
      url = u.toString();
    } catch {
      continue;
    }
    if (seen.has(url)) continue;

    let node = a;
    let cardText = "";
    let prices: number[] = [];
    for (let depth = 0; depth < 7; depth++) {
      const hrefs = new Set<string>();
      for (const inner of node.find("a[href]").toArray()) {
        const innerA = $(inner);
        if (norm(innerA.attr("title") ?? innerA.text()).length >= 12) {
          hrefs.add(innerA.attr("href") ?? "");
        }
      }
      if (hrefs.size > 1) break; // el contenedor ya mezcla varios productos
      cardText = norm(node.text());
      prices = parsePricesAr(cardText);
      if (prices.length > 0) break;
      const parent = node.parent();
      if (parent.length === 0) break;
      node = parent;
    }
    if (prices.length === 0) continue;
    cardsSeen++;

    const cut = ownText.indexOf("$");
    const title = norm(cut > 12 ? ownText.slice(0, cut) : ownText);
    if (!queryMatches(title, query)) continue;

    seen.add(url);
    const priceArs = Math.min(...prices);
    const listPrice = Math.max(...prices);
    found.push({
      title,
      priceArs,
      ...(listPrice > priceArs ? { listPriceArs: listPrice } : {}),
      priceKind: kindFor(cardText),
      url,
      inStock: !/sin stock/i.test(cardText),
    });
  }

  // Con stock primero, luego por precio ascendente.
  found.sort((x, y) => {
    const sx = x.inStock === false ? 1 : 0;
    const sy = y.inStock === false ? 1 : 0;
    return sx - sy || x.priceArs - y.priceArs;
  });
  return { items: found.slice(0, max), cardsSeen };
}
