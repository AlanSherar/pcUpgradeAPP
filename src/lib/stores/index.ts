import { compragamer } from "./compragamer";
import { fullh4rd } from "./fullh4rd";
import { gezatek } from "./gezatek";
import { venex } from "./venex";
import type { StoreAdapter } from "./types";

export const adapters: StoreAdapter[] = [venex, compragamer, fullh4rd, gezatek];

export type { PriceKind, StoreAdapter, StoreItem, StoreResult } from "./types";
