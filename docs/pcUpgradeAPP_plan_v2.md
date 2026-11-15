# pcUpgradeAPP — Plan técnico

**Versión: v2 (2026-11-14)**

## Registro de cambios v1 → v2
La v1 se conserva íntegra: stack, esquema de 9 tablas con RLS, pruebas de tiendas, adaptadores con fallback, costos con URL, fases 0-3 y las 6 decisiones de §8. Cambios:
- **Nuevas:** §4b (ampliaciones del modelo de datos, datos de referencia, combos, calendario de ofertas, proyección prevista), §5b (reglas de relevamiento, compatibilidad, precios, combos, métricas, ofertas), §5c (vistas de entrega, supuestos, cierre, formato, CSV), §6b (qué suma cada fase) y §9 (Cobertura de la receta: 42 ítems).
- **Modificada:** §8 (agregada la lista de qué ítems dependen de cada decisión pendiente; ninguna decisión se tomó) y Anexo (fuentes nuevas).
- **No tocadas:** §1, §2, §3, §4, §5, §6, §7.
- **Pruebas nuevas hoy:** MaxMyBuild, MejoresCompras y fechas CACE 2026. No se volvieron a probar las tiendas.
- **Faltantes conocidos de la v1 resueltos:** combos (§5b.5, Fase 2) y proyección de precios (FUERA DEL MVP, Fase 3, §6b).

Fecha de investigación: 2026-11-14 (reloj de la estación). Zona horaria de la app: America/Argentina/Buenos_Aires, locale es-AR, precios en ARS.
Alcance de este documento: SOLO plan. No hay código ni deploy.
Convención: toda cifra de límites/precios lleva la URL consultada hoy. Lo que no pude comprobar está marcado **sin verificar**.

---

## 1. Objetivo y alcance del MVP

**En una frase:** una web (Next.js en Vercel) donde el Commander carga su PC actual y qué quiere mejorar, y la app corre la receta `investigacion-upgrade-pc` (compatibilidad, precios en vivo con link y hora, métricas, plan por etapas) y guarda cada investigación en Supabase para consultarla después.

**Entra en el MVP**
- Relevamiento guiado (hardware actual, uso/prioridad, componentes a investigar, presupuesto, plazo). Se bloquea el arranque si faltan los puntos 1, 3 y 4 de la receta.
- Chequeo de compatibilidad asistido por IA, con fuente citada.
- Precios en vivo por componente (3-6 opciones), cada uno con tienda, precio, link y fecha/hora.
- Métricas: índice de rendimiento (base 100, marcado como estimado), precio/rendimiento = rend / (precio / 1.000.000), precio por TB en SSD, impacto acumulado por etapa, costo neto con reventa.
- Entrega dentro de la app: tablas y gráficos (reemplazan la planilla de Sheets). Export CSV como extra barato.
- Historial de investigaciones (listar, reabrir, comparar precios de una misma investigación en fechas distintas).
- Un solo usuario (el Commander), login simple con Supabase Auth.

**Queda fuera del MVP**
- Multiusuario público, registro abierto, pagos.
- Export XLSX con gráficos nativos (CSV sí; XLSX después).
- Alertas automáticas de baja de precio y proyección 3-6 meses automatizada (fase posterior).
- Mercado Libre automático (ver sección 3: se carga a mano en el MVP).
- App móvil nativa.

---

## 2. Arquitectura

### Stack recomendado (se mantiene el default, la investigación no lo desmiente)
| Capa | Elección | Dónde corre |
|---|---|---|
| Frontend + API | Next.js (App Router), Route Handlers | Vercel (Functions con Fluid compute) |
| Base de datos + Auth | Supabase Postgres + Supabase Auth | Supabase (nube) |
| IA | API de Anthropic (Claude) vía SDK, llamada solo desde el servidor | Vercel Functions |
| Gráficos | Librería de charts en el cliente (ej. Recharts) | Navegador |
| Scraping | Ver sección 3 | Mixto |

Versión exacta de Next.js a usar: **sin verificar** (se fija en Fase 0 con `npm create`).

### Qué corre dónde
- **Navegador**: pantallas, formularios, gráficos. Nunca ve claves de IA ni la service role de Supabase.
- **Vercel Functions**: endpoints `/api/*` que orquestan IA, scraping y escrituras a Supabase. Límites relevantes (https://vercel.com/docs/functions/limitations): memoria máx. Hobby 2 GB / Pro 4 GB; duración máx. Hobby 300 s (default y máximo), Pro 800 s (1800 s beta); tamaño sin comprimir 250 MB (large functions hasta 5 GB, beta); región por defecto `iad1`.
- **Supabase**: tablas, RLS, Auth. Región del proyecto: elegir la más cercana a Argentina disponible (disponibilidad de región **sin verificar**).
- **Cron diario** (opcional, Fase 3): en Hobby, Vercel Cron solo permite 1 ejecución por día y con precisión de ±59 min (https://vercel.com/docs/cron-jobs/usage-and-pricing). Sirve para refrescos nocturnos, no para algo exacto.

### IA: qué modelo hace qué
Precios de la API hoy (https://docs.anthropic.com/en/docs/about-claude/pricing), por millón de tokens, entrada/salida:
- Claude Sonnet 5.5: $2 / $10 → compatibilidad, recomendación y plan por etapas (razonamiento).
- Claude Haiku 5.5: $0.10 / $0.50 (prompts hasta 100.000 tokens) → extracción/normalización barata de títulos de producto y parseo de HTML/markdown de tiendas.
- Opus 5.5 ($4 / $20) queda como opción si Sonnet falla en casos difíciles. No hace falta en el MVP.

Reglas de uso de la IA (para respetar la receta):
1. La IA **no inventa precios**: los precios entran solo desde `price_snapshots` (scrapeados o cargados a mano). El prompt recibe los datos reales y devuelve análisis.
2. El índice de rendimiento se guarda con `perf_index_is_estimate = true` y una nota de base (ej. benchmark o criterio usado). Fuente de benchmarks: **sin definir** (decisión pendiente, ver sección 8).
3. Cada llamada se registra en `ai_runs` (modelo, tokens, costo) para auditar gasto.
4. Salida estructurada (JSON validado con Zod) para que la UI no dependa de texto libre.

### Claves y secretos (env vars de Vercel)
Variables del proyecto en Vercel (Settings > Environment Variables), nunca en el repo ni con prefijo `NEXT_PUBLIC_` salvo las públicas de Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (públicas por diseño; la protección es RLS).
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor; para jobs de scraping que escriben sin sesión).
- `ANTHROPIC_API_KEY` (solo servidor).
- `FIRECRAWL_API_KEY` o la del servicio de scraping elegido (solo servidor).
- `CRON_SECRET` (para proteger el endpoint de cron).
Desarrollo local: `.env.local` fuera de git. Que Vercel marque variables como "sensitive": **sin verificar** el detalle de la opción.

---

## 3. PUNTO CRÍTICO — Precios en vivo desde Vercel

### 3.1 Resultado de las pruebas reales de hoy (2026-11-14)
La receta dice que fetch/shell no llegan a las tiendas. **Hoy eso es solo parcialmente cierto.** Probé desde la estación (no desde Vercel):

| Fuente | Resultado con `web_fetch` | Con navegador headless | Evidencia |
|---|---|---|---|
| Venex | Responde HTML con productos y precios (texto con problemas de codificación; corte a ~31k caracteres) | no hizo falta | https://www.venex.com.ar/resultado-busqueda.htm?keywords=rtx&order=price_asc → ej. "Placa de Video MSI GeForce RTX 3050 6GB Low Profile OC $ 494.999 Contado efectivo" |
| Compra Gamer | **Solo devolvió el título "COMPRA GAMER"** (la página carga por JS) | **Sí funciona**: tras la espera, listó productos y precios | https://compragamer.com/productos?criterio=rtx%203060 → ej. "ASUS DUAL GeForce RTX 3060 12GB GDDR6 OC V2 $ 912.240" y "Gigabyte RTX 3060 12GB GAMING OC $ 939.900" |
| FullH4rd | HTTP 403 con fetch simple; el lector de la estación reintentó con navegador y funcionó | sí | https://fullh4rd.com.ar/ → ej. "PLACA DE VIDEO GEFORCE RTX 3060 12GB ASUS DUAL V2 OC EDITION Precio especial: $975.300" |
| Gezatek | Responde con precio de lista y "Precio Geza" | no hizo falta | https://www.gezatek.com.ar/ → ej. "Mother Gigabyte B860M K ... $190289 / $172990 Precio Geza" |
| Mercado Libre | Pide login ("¡Hola! Para continuar, ingresa a tu cuenta") | — | https://listado.mercadolibre.com.ar/placa-de-video-rtx-3060 |

Lectura útil: en cuatro tiendas no-ML, **solo Compra Gamer exige navegador real**. FullH4rd bloquea el fetch simple (403), y eso puede repetirse desde IPs de Vercel. **Sin verificar**: si Venex, Gezatek o FullH4rd responden igual desde las IPs de Vercel; hay que probarlo en Fase 0.

Dato extra de precios: no mezclar "precio contado efectivo" (Venex), "Precio especial" (FullH4rd) y "Precio Geza" (Gezatek) sin guardar qué tipo de precio es. El esquema lo contempla (`price_kind`).

Términos de uso/robots.txt de las tiendas respecto del scraping: **sin verificar**. Recomiendo revisarlos antes de automatizar en volumen. El uso es personal y de bajo volumen (unas pocas páginas por investigación).

### 3.2 Opciones viables

**Opción A — Chromium serverless dentro de Vercel (`@sparticuz/chromium` + `puppeteer-core` o Playwright)**
- Qué es: levantar Chromium en la propia función. Repo: https://github.com/Sparticuz/chromium (MIT). El README aclara que el binario `chromium.br` pesa más de 50 MB y, si el proveedor no admite eso, existe `@sparticuz/chromium-min` que descarga el pack desde un host propio.
- Límites reales de Vercel: 250 MB sin comprimir por función; la doc de Vercel cita explícitamente "Puppeteer con su Chromium incluido" entre las causas típicas de funciones demasiado grandes y ofrece "large functions" (hasta 5 GB, beta) (https://vercel.com/docs/functions/limitations). Memoria 2 GB en Hobby; duración 300 s en Hobby.
- Costo: Hobby $0 / Pro $20 por mes (https://vercel.com/pricing). Hobby incluye 4 h de CPU activa y 1 M de invocaciones por mes; suficiente para uso personal.
- Contras: build frágil (versiones puppeteer/chromium acopladas, ver README), arranque en frío, mantenimiento. Que entre dentro de 250 MB con Next.js: **sin verificar**, se mide en Fase 0.

**Opción B — Servicio externo de scraping/navegador (Firecrawl, ScrapingBee o Browserless)**
- Firecrawl (https://www.firecrawl.dev/pricing, vigente desde 4/9/2026): Free 1.000 créditos/mes; Hobby $19/mes mensual ($16 anual) con 5.000 créditos; 1 crédito = 1 página scrapeada; página con error 403/404 igual cuesta 1 crédito; Free permite 2 concurrentes y 10 req/min.
- ScrapingBee (https://www.scrapingbee.com/pricing/): Hobby $19/mes con 75.000 créditos y 25 concurrentes; cada request con renderizado JS cuesta 5 créditos (≈15.000 páginas JS/mes); se aclara que los precios excluyen IVA. No vi plan gratuito en la página (el plan de prueba, **sin verificar**).
- Browserless (https://www.browserless.io/pricing): Free $0 con 1.000 "units"/mes y 2 navegadores concurrentes; Prototyping $25/mes (facturado anual) con 20.000 units; 1 unit = hasta 30 s de navegador. Permite conectar Playwright/Puppeteer remoto, así que el código de la Opción A migra sin cambios grandes.
- Contras: dependencia y clave extra; que rindan bien sobre Compra Gamer y que no sean bloqueados: **sin verificar**. Se prueba en Fase 0 con el plan gratuito.

**Opción C — Worker aparte, fuera de Vercel**
- Un proceso con Playwright en una PC propia, un VPS o un contenedor, que scrapea y escribe directo en Supabase (con service role). La app de Vercel solo lee.
- Límites de Vercel no aplican. Costo de VPS/hosting: **sin verificar** (no consulté proveedores). Contras: otro componente que mantener y monitorear; si la PC está apagada, no hay datos frescos.

**Opción D — Carga semi-manual**
- El Commander pega link y precio (o un texto copiado de la tienda) y la IA (Haiku) lo normaliza al esquema. Costo $0 de infraestructura, cero bloqueos, y es la única vía viable hoy para Mercado Libre porque pide login (https://listado.mercadolibre.com.ar/placa-de-video-rtx-3060). Contra: trabajo manual.
- Mercado Libre vía API oficial: la página de documentación (https://developers.mercadolibre.com.ar/en_us/api-docs) muestra Register/Login y gestión de aplicaciones; si la búsqueda de publicaciones es pública o exige token: **sin verificar**.

### 3.3 Recomendación (híbrido por adaptador de tienda)
1. **Venex, Gezatek, FullH4rd**: fetch directo desde la función de Vercel (parseo HTML) con **fallback automático al servicio externo** si devuelve 403 o vacío.
2. **Compra Gamer**: servicio externo con render JS (empezar probando **Firecrawl Free**, 1 crédito por página). Si no rinde, Browserless Free o Opción A.
3. **Mercado Libre**: carga semi-manual (Opción D) en el MVP; la API oficial queda como investigación posterior.
4. Cada adaptador implementa la misma interfaz (`searchPrices(query) -> Snapshot[]`), así se puede cambiar el motor sin tocar la app. Todo resultado se guarda con `fetch_method` y `captured_at`.

Orden de decisión en Fase 0: probar 4 tiendas **desde un deploy real en Vercel**; el resultado define si hace falta el fallback pago o alcanza con el plan gratuito.

---

## 4. Esquema de Supabase

Principios: usuario único pero con `user_id` en todas las tablas y RLS activado (la doc de Supabase pide habilitar RLS en toda tabla de un schema expuesto y revocar grants a `anon`: https://supabase.com/docs/guides/database/postgres/row-level-security). Los precios de las tiendas nunca se pisan: cada medición es una fila nueva (historial).

### Relaciones
```
auth.users 1─n hardware_profiles
auth.users 1─n researches ──n─1 hardware_profiles
researches 1─n research_components 1─n candidates 1─n price_snapshots
research_components 1─n compat_checks
researches 1─n upgrade_plans 1─n plan_stages ──n─1 candidates
researches 1─n ai_runs
```

### SQL de creación
```sql
-- pcUpgradeAPP · esquema inicial (borrador de plan; no ejecutado)

create table public.hardware_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  cpu text, gpu text, gpu_vram_gb numeric(5,1),
  motherboard text, bios_version text,
  ram_gb int, ram_type text, ram_speed_mhz int,
  ram_slots_total int, ram_slots_free int,
  psu_watts int, psu_cert text, psu_connectors text,
  storage jsonb not null default '[]'::jsonb,   -- [{tipo,modelo,tb}]
  m2_slots_free int,
  cooler text, case_model text,
  case_max_gpu_mm int, case_max_cooler_mm int,
  monitor_res text, monitor_hz int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.researches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  hardware_profile_id uuid references public.hardware_profiles(id) on delete set null,
  hardware_snapshot jsonb not null,             -- copia congelada del hardware al iniciar
  title text not null,
  status text not null default 'draft'
    check (status in ('draft','intake_done','compat_done','pricing','metrics_done','delivered','archived')),
  uses text[] not null default '{}',            -- juegos, ia_local, musica, edicion, streaming
  priorities jsonb not null default '{}'::jsonb,
  components_to_research text[] not null default '{}',
  budget_ars numeric(14,2),
  budget_notes text,
  accepts_used boolean not null default false,
  accepts_imported boolean not null default false,
  deadline_kind text check (deadline_kind in ('now','next_sale','3_6_months')),
  deadline_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table public.research_components (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_id uuid not null references public.researches(id) on delete cascade,
  category text not null
    check (category in ('cpu','gpu','mobo','ram','ssd','psu','cooler','case','monitor','other')),
  query text not null,                          -- término de búsqueda / objetivo
  budget_min_ars numeric(14,2),
  budget_max_ars numeric(14,2),
  compat_status text not null default 'unchecked'
    check (compat_status in ('unchecked','ok','warning','blocked')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.compat_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_component_id uuid not null references public.research_components(id) on delete cascade,
  rule_key text not null,                       -- ej. socket, bios, psu_connector, gpu_length
  severity text not null check (severity in ('info','warning','blocker')),
  message text not null,
  source_url text,
  created_at timestamptz not null default now()
);

-- Las 3-6 opciones concretas por componente
create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_component_id uuid not null references public.research_components(id) on delete cascade,
  label text not null,                          -- ej. "RTX 3060 12GB ASUS Dual V2"
  brand_model text,
  variant_notes text,                           -- XT / VRAM / BULK / sin cooler
  perf_index numeric(7,1),                      -- base 100
  perf_index_is_estimate boolean not null default true,
  perf_index_basis text,                        -- de dónde sale el índice
  capacity_tb numeric(6,2),                     -- para SSD (precio por TB)
  resale_value_ars numeric(14,2),               -- para costo neto
  risk_note text,
  lifespan_note text,
  created_at timestamptz not null default now()
);

create table public.price_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  store text not null,                          -- venex, compragamer, fullh4rd, gezatek, mercadolibre, otra
  product_title text not null,
  sku text,
  price_ars numeric(14,2) not null,
  list_price_ars numeric(14,2),                 -- para marcar descuento real
  price_kind text not null default 'unspecified'
    check (price_kind in ('cash','special','list','installments','unspecified')),
  currency text not null default 'ARS',
  in_stock boolean,
  url text not null,
  fetch_method text not null
    check (fetch_method in ('direct_fetch','headless','scraping_api','manual')),
  captured_at timestamptz not null default now()
);
create index on public.price_snapshots (candidate_id, captured_at desc);

create table public.upgrade_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_id uuid not null references public.researches(id) on delete cascade,
  kind text not null default 'recommended' check (kind in ('recommended','alternative')),
  total_cost_ars numeric(14,2),
  net_cost_ars numeric(14,2),                   -- con reventa
  summary text,
  projection_note text,                         -- espera 3-6 meses / fechas de ofertas
  created_at timestamptz not null default now()
);

create table public.plan_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid not null references public.upgrade_plans(id) on delete cascade,
  stage_no int not null,
  candidate_id uuid references public.candidates(id) on delete set null,
  stage_cost_ars numeric(14,2),
  cumulative_cost_ars numeric(14,2),
  cumulative_perf_index numeric(7,1),
  bottleneck_note text,
  unique (plan_id, stage_no)
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_id uuid references public.researches(id) on delete cascade,
  step text not null,                           -- compat, normalize, metrics, plan
  model text not null,
  input_tokens int, output_tokens int,
  cost_usd numeric(10,5),
  created_at timestamptz not null default now()
);

-- RLS: cada fila es del dueño
do $$
declare t text;
begin
  foreach t in array array[
    'hardware_profiles','researches','research_components','compat_checks',
    'candidates','price_snapshots','upgrade_plans','plan_stages','ai_runs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy "owner_all" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
end $$;
```
Notas:
- Los jobs de servidor con service role saltean RLS; por eso siempre deben setear `user_id` explícito.
- Para impedir que otro usuario se registre: desactivar el signup público en Supabase Auth (ubicación exacta del ajuste: **sin verificar**).
- Vistas útiles (a crear en Fase 1): último snapshot por candidato, precio/rendimiento, precio por TB. La fórmula de la receta se calcula así: `perf_index / (price_ars / 1000000)`.

---

## 4b. Ampliaciones del modelo de datos (v2)

Todo lo de esta sección **se suma** al esquema de §4; no reemplaza nada. El SQL es borrador de plan, no ejecutado, y se valida en Fase 0 junto con el de §4. Los nombres de constraint por defecto de Postgres (`compat_checks_severity_check`, etc.) son una suposición: **sin verificar** hasta correrlo.

### 4b.1 Relevamiento, supuestos, plan alternativo e investigación encadenada (ítems 1, 3, 4, 7, 9, 38, 40, 41)
```sql
-- A. Hardware: campos que faltaban para la compatibilidad fina
alter table public.hardware_profiles
  add column mobo_chipset text,
  add column mobo_socket text,
  add column ram_rated_mhz int,                      -- ram_speed_mhz pasa a ser la velocidad REAL configurada
  add column ram_modules jsonb not null default '[]'::jsonb,  -- [{gb,type,rated_mhz,real_mhz,slot}]
  add column psu_12v2x6 boolean,
  add column psu_pcie_8pin_count int,
  add column cooler_type text,
  add column cooler_height_mm int,
  add column monitor_known boolean not null default true,      -- false => la app declara qué supuso (§5b.1)
  add column field_sources jsonb not null default '{}'::jsonb; -- {campo: 'cpuz_spd'|'bios'|'placa'|'manual'|'desconocido'}

-- B. Investigación: usos con detalle, supuestos editables, cierre, encadenado
alter table public.researches
  add column uses_detail jsonb not null default '{}'::jsonb,
    -- {games:[{title,resolution,hz}], ia_local:{models:[{name,params_b,quant}],backend_pref}, music:{daw,plugins}, edicion:{...}, streaming:{...}}
  add column dominant_use text,                      -- cuál manda cuando los usos se contradicen
  add column assumptions jsonb not null default '{}'::jsonb,
    -- {clave:{value,source:'app'|'user',reason}}: monitor, reventa %, margen de fuente, tolerancia de oferta real
  add column intake_notes jsonb not null default '{}'::jsonb,  -- {ignored_prices:[...]}
  add column parent_research_id uuid references public.researches(id) on delete set null,
  add column closing_recommendation text,
  add column closing_order jsonb,                    -- [{n,candidate_id,store,price_ars,url}]
  add column closing_next_step text;                 -- UNA sola acción

-- C. Componentes: gama, usados/importados por componente, búsquedas separadas, estado de precios
alter table public.research_components
  add column tier text check (tier in ('entry','mid','high')),
  add column accepts_used boolean,                   -- null = hereda de researches
  add column accepts_imported boolean,
  add column search_scope text not null default 'general' check (search_scope in ('general','capacity')),
  add column capacity_filter_tb numeric(6,2),        -- ej. 2 para la búsqueda "2tb" de SSD
  add column pricing_status text not null default 'pending'
    check (pricing_status in ('pending','running','partial','done','interrupted'));

-- D. Compatibilidad: estado "verificar" (dato no listado / no comprobado)
alter table public.compat_checks drop constraint compat_checks_severity_check;
alter table public.compat_checks add constraint compat_checks_severity_check
  check (severity in ('info','warning','blocker','verify'));
alter table public.research_components drop constraint research_components_compat_status_check;
alter table public.research_components add constraint research_components_compat_status_check
  check (compat_status in ('unchecked','ok','warning','verify','blocked'));
```
**Plan alternativo sin pisar el anterior (ítem 9).** Un cambio de prioridad a mitad de sesión nunca hace `UPDATE` sobre un plan existente: crea otra fila en `upgrade_plans` con `kind='alternative'`, su propio `priorities`, `parent_plan_id` apuntando al plan de origen y su propio juego de `plan_stages`. `researches.priorities` queda con la prioridad original. Las columnas están en 4b.4.

### 4b.2 Datos de referencia: dónde se guardan y de dónde salen (ítems 11, 12, 15, 18, 19)
Una tabla compartida de solo lectura para la app, que escribe únicamente el service role (o el Commander a mano):
```sql
create table public.reference_data (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in
    ('cpu_spec','cpu_bios','platform','pcie','gpu_spec','mobo_vrm','cooler_spec','case_spec','bios_flash','field_help')),
  key text not null,                                -- ej. 'cpu_bios|<modelo de mother>|<modelo de CPU>'
  data jsonb not null,
  source_url text not null,                         -- sin URL no entra
  source_kind text not null check (source_kind in ('manufacturer','third_party','manual','ai_draft')),
  verified boolean not null default false,
  fetched_at timestamptz not null default now(),
  unique (kind, key),
  check (source_kind <> 'ai_draft' or verified = false)   -- un borrador de IA jamás figura como verificado
);
```
| kind | Qué guarda | De dónde sale |
|---|---|---|
| `cpu_spec` | socket, TDP, si trae video integrado, si trae cooler, generación PCIe | página oficial del fabricante del CPU |
| `cpu_bios` | BIOS mínima por CPU para cada mother | **lista oficial de CPU compatibles del fabricante de la mother** (no de terceros) |
| `platform` / `pcie` | tipo de RAM, slots y generación/lanes por slot PCIe y por M.2 | manual/página oficial de la mother |
| `gpu_spec` | largo (mm), consumo, conectores (8 pines / 12V-2x6), VRAM, lanes | ficha oficial del modelo exacto |
| `cooler_spec` / `case_spec` | altura del cooler, largo máx. de GPU y altura máx. de cooler del gabinete | ficha oficial |
| `mobo_vrm` | potencia de VRM que soporta cada mother | manual del fabricante cuando exista; MaxMyBuild como comparador (ver nota) |
| `bios_flash` | cómo actualizar BIOS: M-Flash (MSI), Q-Flash (Gigabyte) | manual del fabricante; para otras marcas: **sin verificar** |
| `field_help` | texto "cómo averiguarlo" por campo del formulario (§5b.1) | redactado por nosotros, revisado a mano |

Reglas: (1) la IA de compatibilidad recibe **solo** filas de esta tabla más el hardware del usuario; (2) si falta la fila (incluye reediciones de CPU que el fabricante no lista) el resultado es `verify`, nunca "ok"; (3) la IA puede proponer filas, pero entran con `source_kind='ai_draft'` y `verified=false` y la UI las muestra como "verificar"; (4) cada fila guarda `source_url` y `fetched_at`, y se muestra en el aviso de compatibilidad.

Nota sobre MaxMyBuild (https://maxmybuild.com, consultado 2026-11-14): su sección de motherboards dice ordenar placas **AM5, LGA1851 y LGA1700** por "VRM power" y los precios que muestra son de US/DE/UK (no hay Argentina), y la sección de RAM, coolers y gabinetes figura como "Soon". Por lo tanto sirve como referencia de VRM solo para esos sockets; la unidad y la metodología del dato "VRM power" y los términos de uso para leerlo desde la app: **sin verificar**. Para otros sockets el resultado es `verify`. En el MVP esas filas se cargan a mano con su `source_url`.

### 4b.3 Precios, variantes, combos, ofertas y riesgo (ítems 16, 17, 21-26, 34)
```sql
-- Tablas nuevas
create table public.sale_calendar (
  id uuid primary key default gen_random_uuid(),
  name text not null,                               -- '11.11','Hot Sale','CyberMonday','Black Friday'
  starts_on date not null,
  ends_on date not null,
  source_url text not null,
  confirmed boolean not null default false,
  unique (name, starts_on)
);

create table public.price_fetch_runs (               -- un intento por tienda y componente
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_component_id uuid not null references public.research_components(id) on delete cascade,
  store text not null,
  status text not null check (status in ('ok','blocked','empty','timeout','error','skipped')),
  http_status int,
  fetch_method text,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_id uuid not null references public.researches(id) on delete cascade,
  label text not null,                              -- ej. 'GPU + fuente 750 W'
  origin text not null check (origin in ('store_bundle','derived')),
  store text,
  url text,                                         -- obligatorio si origin='store_bundle'
  price_ars numeric(14,2) not null,
  list_price_ars numeric(14,2),
  loose_total_ars numeric(14,2),                    -- suma de los ítems sueltos medidos en el mismo momento
  captured_at timestamptz not null default now(),
  note text
);
create table public.combo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  combo_id uuid not null references public.combos(id) on delete cascade,
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  qty int not null default 1
);

-- Variantes, cooler aparte, video integrado, opción superior, rendimiento por uso
alter table public.candidates
  add column variant jsonb not null default '{}'::jsonb,       -- {bulk,xt,vram_gb,reissue_of,oem}
  add column includes_cooler boolean,                          -- false => costo del cooler en columna propia
  add column cooler_candidate_id uuid references public.candidates(id) on delete set null,
  add column has_igpu boolean,
  add column is_superior_option boolean not null default false,
  add column superior_justification text,
  add column perf_by_use jsonb not null default '{}'::jsonb;   -- {gaming_1080p,gaming_1440p,ia_local,music,edit}

-- Cada medición: oferta, evento, riesgo y confirmación
alter table public.price_snapshots
  add column discount_pct numeric(5,2) generated always as
    (case when list_price_ars > 0 then round((1 - price_ars / list_price_ars) * 100, 2) end) stored,
  add column sale_event_id uuid references public.sale_calendar(id),
  add column offer_verdict text check (offer_verdict in ('real','inflated','no_data')),
  add column is_imported boolean,
  add column is_used boolean,
  add column seller_name text,
  add column seller_is_new boolean,
  add column warranty_note text,
  add column risk_flags text[] not null default '{}',          -- 'sin_garantia_local','vendedor_nuevo','precio_muy_bajo'
  add column confirmed boolean not null default true,
  add column unconfirmed_reason text,
  add column fetch_run_id uuid references public.price_fetch_runs(id) on delete set null;
```
Confirmado (ítem 20): `price_snapshots.captured_at` ya es `timestamptz` y cada medición es una fila nueva (§4); la UI lo muestra en America/Argentina/Buenos_Aires.

### 4b.4 Plan por etapas y métricas por uso (ítems 29, 30, 31, 32, 33)
```sql
alter table public.upgrade_plans
  add column label text,
  add column priorities jsonb not null default '{}'::jsonb,    -- prioridad con la que se armó ESTE plan
  add column parent_plan_id uuid references public.upgrade_plans(id) on delete set null,
  add column order_kind text check (order_kind in ('recommended_order','alternative_order')),
  add column prices_as_of timestamptz;                         -- fecha y hora de los precios usados

alter table public.plan_stages
  add column stage_gain_pct numeric(6,2),                      -- % de mejora de ESTA etapa
  add column cumulative_gain_pct numeric(6,2),                 -- % acumulado desde el hardware actual
  add column replaces_part text,                               -- pieza actual que se reemplaza
  add column resale_est_ars numeric(14,2),                     -- supuesto editable
  add column net_stage_cost_ars numeric(14,2),                 -- stage_cost - reventa estimada
  add column combo_id uuid references public.combos(id) on delete set null,
  add column bottleneck_1080p text,
  add column bottleneck_1440p text,
  add column bottleneck_by_use jsonb not null default '{}'::jsonb,   -- usos no gaming
  add column complements jsonb not null default '[]'::jsonb;         -- [{depende_de_etapa,efecto,es_estimacion:true}]
```

### 4b.5 Calendario de ofertas y proyección de precios (ítems 35, 36)
```sql
create table public.price_projections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  research_id uuid not null references public.researches(id) on delete cascade,
  research_component_id uuid references public.research_components(id) on delete cascade,
  horizon_months int not null check (horizon_months in (3,6)),
  direction text not null check (direction in ('up','flat','down')),
  probability_pct numeric(5,2) not null check (probability_pct between 0 and 100),
  rationale text not null,
  news_refs jsonb not null default '[]'::jsonb,                -- [{title,url,date}]: sin noticia citada no hay proyección
  fx_usd_ars numeric(12,2),
  fx_source_url text,
  is_estimate boolean not null default true,
  created_at timestamptz not null default now()
);
```
**Estado: FUERA DEL MVP, Fase 3** (ver §6b). La tabla se crea en Fase 3 y se deja prevista acá para que el modelo no cambie después. Fechas de ofertas conocidas hoy (cargar en `sale_calendar`, `confirmed` se pasa a true al verificar la fuente oficial):
| Evento | Fechas | Fuente consultada 2026-11-14 | Estado a hoy |
|---|---|---|---|
| CyberMonday 2026 | 2 al 4 de noviembre (CACE) | https://www.ambito.com/economia/confirmaron-las-fechas-del-black-friday-y-cyber-monday-2026-n6326087 y https://sentidonacional.com/2026/09/24/confirmaron-fechas-black-friday-cyber-monday-2026/ | ya pasó |
| Black Friday 2026 | 27 de noviembre | las mismas dos fuentes; https://mejorescompras.com.ar muestra "Faltan 13 días" | próxima fecha: en 13 días |
| Hot Sale 2026 | 11 al 13 de mayo | https://cace.org.ar/blogs/news/hot-sale-2026-mas-de-800-marcas-se-preparan-para-impulsar-el-consumo-digital | ya pasó; edición 2027: **sin verificar** |
| 11.11 | 11 de noviembre (el nombre fija la fecha) | sin fuente consultada | ya pasó; qué tiendas participan: **sin verificar** |

### 4b.6 RLS de las tablas nuevas
```sql
do $$
declare t text;
begin
  -- del usuario: mismo patrón que §4
  foreach t in array array['combos','combo_items','price_fetch_runs','price_projections'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format(
      'create policy "owner_all" on public.%I for all to authenticated
         using ((select auth.uid()) = user_id)
         with check ((select auth.uid()) = user_id)', t);
  end loop;
  -- compartidas: lectura para autenticados, escritura solo service role (sin policy de escritura)
  foreach t in array array['reference_data','sale_calendar'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy "read_authenticated" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;
```
Orden de ejecución del borrador: SQL de §4, luego tablas nuevas de 4b.2 y 4b.3 (`reference_data`, `sale_calendar`, `price_fetch_runs`, `combos`, `combo_items`), luego los `alter table` de 4b.1, 4b.3 y 4b.4, luego `price_projections` (Fase 3) y por último este bloque RLS.

---

## 5. Flujo de la receta → pantallas y endpoints

| Paso receta | Pantalla | Endpoint (Route Handler) | Qué hace |
|---|---|---|---|
| Login | `/login` | Supabase Auth | Magic link o email+clave |
| 1. Relevamiento (hardware) | `/hardware` (perfiles) | `POST/PUT /api/hardware` | CRUD del PC actual |
| 1. Relevamiento (uso, componentes, presupuesto, plazo) | `/research/new` (wizard de 5 pasos) | `POST /api/research` | Crea `researches` con `hardware_snapshot`. Valida que estén los puntos 1, 3 y 4 antes de avanzar |
| 2. Compatibilidad | `/research/[id]/compat` | `POST /api/research/[id]/compat` | IA (Sonnet) con reglas de la receta: socket, BIOS, PCIe, RAM dual channel, fuente, largo GPU/altura cooler, CPU sin cooler, APU en PCIe 3.0, VRM. Guarda `compat_checks` con fuente |
| 3. Precios en vivo | `/research/[id]/prices` | `POST /api/research/[id]/prices/[componentId]` (uno por componente, para quedar bajo el timeout) | Corre adaptadores de tienda, Haiku normaliza, guarda `candidates` + `price_snapshots`. Botón "cargar precio a mano" para Mercado Libre |
| 4. Métricas | `/research/[id]/metrics` | `POST /api/research/[id]/metrics` | Sonnet estima índice base 100 (marcado estimado); la app calcula precio/rendimiento, precio/TB, costo neto |
| 4. Plan por etapas | `/research/[id]/plan` | `POST /api/research/[id]/plan` | Genera `upgrade_plans` + `plan_stages` con impacto acumulado y cuellos de botella |
| 5. Entrega | `/research/[id]` (resumen) | `GET /api/research/[id]/export.csv` | Vistas: Resumen de compra, una tabla por componente, gráfico de línea (rendimiento acumulado), barras de costo por etapa, Recomendación. Reemplaza las pestañas de Sheets |
| Historial | `/history` | `GET /api/research` | Lista, reabre, duplica una investigación y compara precios entre fechas |

Diseño de las llamadas largas: cada endpoint de scraping/IA corre en una sola función y debe terminar dentro de 300 s (límite Hobby, https://vercel.com/docs/functions/limitations). Por eso el scraping va por componente y el cliente muestra progreso. Si algún paso no entra, se divide o se pasa a un job asincrónico (Fase 2).

---

## 5b. Reglas de negocio ampliadas (v2)

Completan el flujo de §5. Cada regla indica dónde vive el dato (§4/§4b) y qué pantalla/endpoint la usa.

### 5b.1 Relevamiento (ítems 1-9)
- **Formulario de hardware** (`/hardware`, wizard paso 1): CPU; GPU modelo exacto + VRAM; mother modelo + versión de BIOS; RAM cantidad, módulos, velocidad nominal y **velocidad real**, slots usados/libres; fuente W + certificación + conectores (8 pines, 12V-2x6); almacenamiento (tipo y M.2 libres); cooler; gabinete; monitor (resolución y Hz). Columnas en §4 y 4b.1.
- **Ayuda "cómo averiguarlo" por campo** (ítem 2): ícono "?" junto a cada campo que abre el texto de `reference_data` (`kind='field_help'`). Contenido mínimo: velocidad real y módulos de RAM → CPU-Z, pestañas Memory y SPD; versión de BIOS → pantalla de BIOS o CPU-Z (pestaña Mainboard); modelo de la mother → impreso en la placa. `field_sources` guarda cómo se obtuvo cada dato (CPU-Z, BIOS, placa, a mano, desconocido); un campo "desconocido" baja la certeza de las reglas que lo usan y se avisa en la compatibilidad.
- **Usos** (ítem 3): juegos con título, resolución y Hz; IA local con modelos que quiere correr; producción musical; edición; streaming. `dominant_use` obliga a elegir cuál manda si hay contradicción; ese uso ordena el plan recomendado (§5b.6).
- **Componentes, presupuesto y gama** (ítem 4): por componente se pide presupuesto (`budget_min/max_ars`) **o** gama (`tier`), y si acepta usados/importados (por investigación y por componente).
- **Plazo** (ítem 5): `deadline_kind` = ahora / próxima fecha de ofertas / 3-6 meses, ya en §4. Con "próxima fecha de ofertas" o "3-6 meses" se activa la lógica de §5b.7.
- **Precios escritos junto al hardware se ignoran** (ítem 6): el servidor corre un saneador sobre los campos de texto libre; todo importe en pesos o dólares detectado se mueve a `intake_notes.ignored_prices` (se muestra "ignoré estos precios: …") y **no** llega a ningún prompt. Los precios solo entran por `price_snapshots`.
- **Monitor faltante** (ítem 7): si `monitor_known=false`, la app escribe en `researches.assumptions.monitor` el valor supuesto (valor por defecto propuesto: 1080p a 60 Hz, **decisión de diseño mía, sin fuente**), con `source:'app'` y el motivo, y muestra un cartel fijo "Supuse monitor …" en toda vista de resultados. Es editable (§5c.3).
- **No arranca sin lo mínimo** (ítem 8): validación **en el servidor** (mismo esquema Zod que el cliente) en `POST /api/research`: hardware mínimo (CPU, GPU o "sin GPU", mother, RAM total y módulos, fuente W, almacenamiento, gabinete), al menos un componente a investigar y presupuesto o gama por componente. Responde 422 con la lista de faltantes; el botón "Iniciar" queda deshabilitado en el cliente.
- **Cambio de prioridad a mitad de sesión** (ítem 9): botón "Cambiar prioridad" crea un `upgrade_plans` nuevo (`kind='alternative'`, `priorities` propio, `parent_plan_id`) y regenera solo sus etapas. El plan anterior no se modifica; la UI los muestra en pestañas.

### 5b.2 Compatibilidad (ítems 10-19)
La IA (Sonnet) recibe el hardware del usuario y **solo** filas de `reference_data` (§4b.2); devuelve JSON validado y se guarda en `compat_checks` con `source_url`. Si falta un dato: `verify`.
| rule_key | Qué se chequea | Dato de referencia | Resultado |
|---|---|---|---|
| `socket` | Socket/plataforma del CPU candidato vs. mother. Si no coincide, **calcula el costo de cambiar plataforma**: mother + RAM (si cambia el tipo) + cooler si hace falta, con los mejores snapshots vigentes | `cpu_spec`, `platform` | `blocker` + línea "Cambio de plataforma: $X" (ítem 10) |
| `bios` | BIOS mínima exigida por la mother para ese CPU, tomada de la **lista oficial de CPU compatibles del fabricante de la mother**. CPU que no figura (incluye reediciones) = `verify` ("verificar con el fabricante"). Si la BIOS instalada es menor: `warning` con instrucciones para actualizar (M-Flash en MSI, Q-Flash en Gigabyte; otras marcas: **sin verificar**) | `cpu_bios`, `bios_flash` | ítem 11 |
| `pcie` | Generación y lanes por slot PCIe y por M.2. GPU de x8 en PCIe 3.0: aviso de pérdida posible. Ryzen 5000G corren en PCIe 3.0: aviso al combinarlos con GPU PCIe 4.0 (dato de la receta, **sin verificar contra el fabricante**) | `pcie`, `gpu_spec` | ítem 12 |
| `ram` | Tipo (DDR4/DDR5) vs. mother, slots libres, dual channel con los slots correctos (A2/B2 según el manual de la mother), **no mezclar kits**: si hay slots libres pero los módulos actuales son de otro kit, recomendar un kit completo nuevo | `platform` | ítem 13 |
| `psu` | Watts necesarios = consumo de CPU + GPU + resto, con **margen** (parámetro editable `assumptions.psu_margin_pct`, valor de arranque a definir en Fase 1: **sin verificar**); conectores 8 pines / 12V-2x6 que exige la GPU vs. los de la fuente; certificación | `gpu_spec`, `cpu_spec` | ítem 14 |
| `gpu_length` / `cooler_height` | Largo de GPU y altura de cooler vs. `case_max_gpu_mm` y `case_max_cooler_mm` | `gpu_spec`, `cooler_spec`, `case_spec` | ítem 15 |
| `cooler_missing` | CPU sin cooler incluido (`includes_cooler=false`): se agrega el cooler y su costo va en **columna propia** "Cooler (ARS)" de la tabla (§5c.1) y suma al total | `cpu_spec` | ítem 16 |
| `no_igpu` | Opción sin video integrado (`has_igpu=false`) y el perfil no tiene GPU: aviso `blocker` "no da imagen sin placa de video" | `cpu_spec` | ítem 17 |
| `vrm` | Antes de recomendar cambiar de mother, compara la potencia de VRM que soporta cada mother candidata con la que pide el CPU; si la mother actual alcanza, no se recomienda el cambio | `mobo_vrm` | ítem 18 (cobertura de datos y límites: nota de 4b.2) |

Dónde se guardan y de dónde salen los datos de referencia (ítem 19): §4b.2.

### 5b.3 Contrato de la IA con los precios
La IA nunca devuelve importes: devuelve **ids de `price_snapshots`** y la app une precio, tienda, link y fecha. Cualquier importe en la respuesta de la IA que no corresponda a un snapshot se descarta y se registra en `ai_runs`.

### 5b.4 Precios: reglas (ítems 20-26)
1. **Sin precio de memoria ni link inventado** (ítem 20): el precio sale del adaptador de tienda (o de la carga manual) y el `url` es el que devolvió el adaptador o el que pegó el Commander. Validación al guardar: el dominio debe estar en la lista de tiendas permitidas y el link debe figurar en el resultado del adaptador; si no, se rechaza. Fecha y hora por medición: `captured_at` (§4).
2. **Mercado Libre y MejoresCompras** (ítem 21): ML sigue manual en el MVP (§3.3). Cada fila de ML muestra un botón "Verificar descuento" que abre https://mejorescompras.com.ar, sitio que (según su propia página, consultada 2026-11-14) lleva historial diario de precios de ML y marca descuentos como "real", "inflado" o "recurrente", y ofrece una extensión de Chrome y un analizador por link. No se integra por código (su página rechazó el fetch simple con 403; términos de uso: **sin verificar**). La cifra que publican sobre descuentos falsos es suya y no la usamos como dato. **Aviso de importados** (ítem 21): cuando `is_imported` es true, la fila muestra "sin garantía local posible", "vendedor nuevo" y "precio muy bajo" según corresponda (`risk_flags`); "precio muy bajo" = por debajo de la mediana de los otros snapshots del candidato en un porcentaje editable (`assumptions.low_price_flag_pct`, valor de arranque a definir: **sin verificar**).
3. **Precio de lista y final, % OFF y eventos** (ítem 23): se guardan `list_price_ars` y `price_ars`; `discount_pct` se calcula; si `captured_at` cae dentro de un rango de `sale_calendar` se asigna `sale_event_id` (11.11, Hot Sale, CyberMonday, Black Friday). **Oferta real vs. inflada** (`offer_verdict`): (a) se compara el precio con el de las otras tiendas medido en el mismo momento; (b) se compara con el historial propio del candidato (snapshots anteriores). `real` si es igual o menor al mínimo previo dentro de una tolerancia editable; `inflated` si el precio de lista actual supera a los precios finales previos del mismo candidato y el "descuento" lleva el precio por debajo de ellos solo en apariencia; `no_data` si no hay historial ni otra tienda. Los umbrales viven en `assumptions` (valores de arranque a definir en Fase 2: **sin verificar**).
4. **Variantes** (ítem 24): BULK, XT / no XT, VRAM, reedición y OEM se extraen del título (Haiku) a `candidates.variant`; dos productos con variante distinta son candidatos distintos y nunca se fusionan. BULK muestra aviso de que puede venir sin caja ni accesorios; qué trae exactamente según cada tienda: **sin verificar**.
5. **Búsquedas separadas y cantidad de opciones** (ítem 25): cada búsqueda es una fila de `research_components`; para SSD se crean dos (`search_scope='general'` y otra `capacity` con `capacity_filter_tb=2`). Se piden **3 a 6 opciones por componente** y, si se justifica, una **opción superior** (`is_superior_option`, con `superior_justification` obligatoria).
6. **Búsqueda interrumpida** (ítem 26): cada tienda se guarda al llegar (`price_fetch_runs` + snapshots), no al final. Si se corta, `pricing_status='interrupted'` conserva todo lo obtenido; lo que no se alcanzó queda como fila de `price_fetch_runs` en `skipped/timeout/error` y en pantalla como "no confirmado". "Reanudar" corre solo las tiendas faltantes. Un precio cuya tienda no pudo reconfirmarse se marca `confirmed=false` con motivo. Depende de la decisión 3 de §8 (servicio de scraping pago o no) para que la tasa de fallos baje.

### 5b.5 Combos (ítem 22)
Faltante de la v1, agregado. Dos orígenes:
- **Combo de tienda (`store_bundle`)**: la tienda lo publica como un solo producto ("combo", "kit", "+"). Se detecta al normalizar el título (Haiku: si el título nombra 2+ componentes de categorías distintas, marca combo y crea `combo_items`) y también a mano con el botón "esto es un combo". Se guarda con link y fecha como cualquier precio.
- **Combo derivado (`derived`)**: la app lo propone cuando la compatibilidad lo exige (ej. una GPU cuyo `psu` da `blocker` → par GPU + fuente) y suma los mejores precios de **la misma tienda**.
**Cómo se muestra**: bloque "Combo vs. suelto" bajo la tabla del componente principal: precio del combo, suma de los ítems sueltos medida en el mismo momento (`loose_total_ars`), diferencia en pesos y %, y los ítems con su link. En el plan, una etapa puede apuntar al combo (`plan_stages.combo_id`). Las dos vías entran en **Fase 2**; el caso GPU + fuente es el candidato natural para el primer test (ver decisión 6 de §8).

### 5b.6 Métricas y plan por etapas (ítems 27-34)
- **Índice de rendimiento** (27): base 100, siempre marcado "estimado" en pantalla. La fuente es la decisión pendiente 1 de §8, y se mantienen las dos alternativas: **(A)** benchmarks públicos que elija el Commander (el índice se normaliza a base 100 contra una pieza de referencia y `perf_index_basis` guarda fuente y fecha); **(B)** estimación de la IA, marcada como tal. El esquema soporta ambas sin cambios; hasta que se decida, el valor de `perf_index_is_estimate` es true en los dos casos.
- **Fórmulas** (28): precio por rendimiento = `perf_index / (price_ars / 1.000.000)`; para SSD, además, precio por TB = `price_ars / capacity_tb`.
- **Plan por etapas** (29): por etapa se guardan costo, `stage_gain_pct` (% de mejora de esa etapa) y `cumulative_gain_pct` (acumulado desde el hardware actual). Se generan **dos órdenes**: el recomendado (ordenado según `dominant_use`) y uno alternativo (ordenado por mejor precio/rendimiento por etapa), cada uno como `upgrade_plans` propio. Por etapa, cuello de botella a 1080p y 1440p (`bottleneck_1080p`, `bottleneck_1440p`, estimados y marcados) y para usos no gaming en `bottleneck_by_use`.
- **Complementación** (30): `complements` registra qué pieza depende de otra (ej. una GPU nueva rinde por debajo de lo esperado con el CPU actual). Es estimación de la IA, marcada.
- **Costo neto** (31): `net_stage_cost_ars = stage_cost_ars - resale_est_ars`; reventa estimada = supuesto editable (`assumptions`), recalculado sin volver a llamar a la IA (§5c.3).
- **IA local** (32): se compara la VRAM del candidato con la que necesita cada modelo declarado en `uses_detail.ia_local` (tamaño y cuantización), el soporte de **CUDA o ROCm** según el fabricante de la GPU, la RAM del sistema y el espacio de disco. Los requisitos por modelo son estimaciones de la IA con fuente si la hay; si no, **sin verificar**.
- **Producción musical** (33): se priorizan **núcleos y caché** del CPU; la GPU no aporta rendimiento de audio; la RAM solo si el uso actual la llena. Si el plan incluye una etapa de GPU y el uso incluye música, el resumen agrega el aviso de **correr LatencyMon después de instalar la GPU**.
- **Vida útil y riesgo** (34): `lifespan_note` y `risk_note` por candidato (estimación marcada) más garantía, importación y vendedor tomados de `price_snapshots` (`warranty_note`, `is_imported`, `seller_is_new`).

### 5b.7 Fechas de ofertas y "¿conviene esperar?" (ítem 36)
`sale_calendar` (§4b.5) alimenta un cartel por investigación: próxima fecha y días que faltan. A hoy (2026-11-14) la próxima es el Black Friday del 27 de noviembre, a 13 días. Regla: si `deadline_kind='now'` no se sugiere esperar; si es `next_sale` o `3_6_months` y el precio actual **no** es el mínimo de su historial (o no hay historial: `no_data`), el cartel dice "esperar a <evento> es razonable" con el motivo y con la salvedad de que el historial puede ser corto. La decisión de comprar sigue siendo del Commander.

### 5b.8 Investigación nueva encadenada (ítem 41)
"Sumar a investigación anterior" crea una investigación con `parent_research_id`, copia el `hardware_snapshot` y deja elegir qué candidatos de la anterior se **referencian** (no se copian ni se modifican). Precios nuevos entran como snapshots nuevos. Se puede abrir una vista combinada padre + hija; la anterior queda intacta.

---

## 5c. Entrega dentro de la app (v2): reemplaza la planilla de Sheets

### 5c.1 Vistas (ítem 37)
1. **Resumen de compra**: total de lo elegido (suma de precios + cooler cuando corresponde), total neto con la **nota de reventa** ("neto = precio − reventa estimada; la reventa es un supuesto editable"), fecha y hora de los precios.
2. **Tabla por componente** (una por categoría), columnas: **Modelo | Dato clave | Tienda | Precio | Métrica | Rendimiento | Nota | Link**. "Métrica" es precio/rendimiento (o precio por TB en SSD). Además, **Cooler (ARS)** cuando aplica (§5b.2) y un ícono de aviso que despliega los `compat_checks` y los `risk_flags`. La **fila recomendada va resaltada**.
3. **Plan de upgrade**: gráfico de **línea** del rendimiento acumulado por etapa (`cumulative_gain_pct`) y **barras** del costo por etapa; pestañas para plan recomendado, orden alternativo y planes alternativos por cambio de prioridad.
4. **Recomendación**: lista numerada (1, 2, 3…) con el texto, y debajo "Precios al <fecha y hora>".
Gráficos con la librería de §2 (Recharts, **sin verificar** que sea la final).

### 5c.2 Datos de cada gráfico
Línea: eje X = número de etapa, eje Y = rendimiento acumulado (base 100). Barras: eje X = etapa, eje Y = costo en ARS. Ambos leen de `plan_stages` del plan activo.

### 5c.3 Supuestos editables (ítem 38)
Pantalla "Supuestos" por investigación sobre `researches.assumptions`: monitor, % de reventa, margen de fuente, umbral de "precio muy bajo", tolerancia de oferta real. Al guardar, el servidor **recalcula solo las métricas derivadas** (precio/rendimiento, precio/TB, costo neto, totales, `offer_verdict`, avisos) con funciones/vistas SQL, **sin** nuevo scraping ni nueva llamada a la IA. Lo que estimó la IA (índice, cuellos de botella) no se recalcula; si cambia un supuesto que lo invalida (ej. monitor), la UI ofrece "Regenerar con IA" y lo avisa.

### 5c.4 Cierre de cada investigación (ítem 40)
Al marcar `delivered` el servidor exige tres campos: `closing_recommendation` (texto corto), `closing_order` (orden de compra: lista ordenada con tienda, precio y link) y `closing_next_step` (**una sola** acción, validado a un único ítem).

### 5c.5 Formato (ítem 39)
Pesos con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`; es el equivalente en la app de `$#,##0` de una planilla. Cómo queda exactamente escrito el separador y el espacio con el símbolo en es-AR: **sin verificar**, se comprueba en Fase 1. Fechas y horas siempre en `America/Argentina/Buenos_Aires`; en la base se guardan en `timestamptz`.

### 5c.6 Export CSV (ítem 42)
Ya previsto en Fase 2 (§1, §5, §6). Detalle: un archivo por vista (resumen, tablas por componente, plan), con las mismas columnas de pantalla, UTF-8 con BOM. Delimitador `;` y coma decimal propuestos para que lo abra bien una hoja de cálculo en es-AR: **sin verificar**. Pendiente de confirmar con el Commander (no es una de las 6 decisiones de §8): ¿CSV alcanza o quiere XLSX antes de Fase 3?

---

## 6. Fases con entregables verificables

**Fase 0 — Setup y pruebas de riesgo (la más importante)**
- Entregable: repo Next.js desplegado en Vercel (Hobby), proyecto Supabase, variables de entorno cargadas, página `/api/health` y una función de prueba de scraping.
- Se verifica con: (1) `/api/health` responde 200 en la URL de Vercel; (2) la función de prueba trae precios reales de las 4 tiendas **desde Vercel** y se anota qué tiendas responden con fetch directo y cuál necesita servicio externo; (3) se mide el tamaño de la función si se prueba Chromium; (4) el SQL de la sección 4 corre sin errores y un `select` con otro usuario devuelve 0 filas (RLS).

**Fase 1 — MVP mínimo end-to-end**
- Entregable: login, wizard de relevamiento, compatibilidad, precios (Venex + Gezatek + FullH4rd + Compra Gamer + carga manual), métricas básicas, vista de resultado con tabla y un gráfico, y guardado en Supabase.
- Se verifica con: una investigación real de punta a punta (por ejemplo una GPU) que queda guardada, se reabre desde `/history`, y cada precio tiene tienda, link y fecha/hora que abren la página real. Se revisa a mano 3 precios contra la tienda.

**Fase 2 — Plan por etapas y entrega completa**
- Entregable: plan por etapas con impacto acumulado, costo neto con reventa, los dos gráficos, export CSV, comparación de snapshots entre fechas.
- Se verifica con: la fórmula de precio/rendimiento recalculada a mano para 2 candidatos coincide con la pantalla; el CSV abre en una hoja de cálculo.

**Fase 3 — Automatización y pulido**
- Entregable: refresco diario por cron, alertas simples de baja de precio, carga de Mercado Libre mejorada (API oficial si resulta viable), export XLSX.
- Se verifica con: el cron deja snapshots nuevos al día siguiente y se ven en el historial.

---

## 6b. Ajustes a las fases por la v2

Las fases 0-3 de §6 se mantienen. Esto es lo que se **suma** a cada una; el alcance MVP (§1) no cambia salvo lo indicado.

| Fase | Se suma | Se verifica con |
|---|---|---|
| **0** | Correr el SQL de §4 **y** el de §4b en un proyecto de prueba; cargar `reference_data` mínima para el caso del primer test (al menos `cpu_spec`, `cpu_bios`, `gpu_spec`, `bios_flash` y `field_help` del caso elegido) y `sale_calendar` con las fechas de §4b.5 | el SQL de §4b corre sin errores (esto prueba también los nombres de constraint de 4b.1); un `select` de otro usuario sobre las tablas del usuario devuelve 0 filas y sobre `reference_data` solo lectura |
| **1** | Wizard completo de relevamiento con ayudas por campo, saneador de precios, supuesto de monitor y validación 422 (§5b.1); motor de compatibilidad con los 9 `rule_key` de §5b.2, estado `verify`, costo de cambio de plataforma y columna de cooler; reglas de precio de §5b.4 puntos 1, 2, 4, 5 y 6 (link validado, riesgo de importados, variantes, búsquedas separadas, interrupción y reanudación); contrato de ids de snapshot (§5b.3); vistas de §5c.1 en versión simple | prueba con hardware que tenga un dato faltante: la app dice `verify` en lugar de "ok"; un precio escrito en el texto del hardware aparece en `ignored_prices` y no en el prompt; cortar una búsqueda a mitad deja lo guardado y marca el resto "no confirmado"; 3 links abren la página real |
| **2** | Combos (§5b.5); oferta real vs. inflada y eventos (§5b.4 punto 3); dos órdenes de plan, plan alternativo por cambio de prioridad, % por etapa, cuellos de botella, complementación, métricas por uso (IA local, música) y costo neto (§5b.6); supuestos editables con recálculo (§5c.3); cierre obligatorio (§5c.4); investigación encadenada (§5b.8); calendario y cartel "¿esperar?" (§5b.7); formato de moneda y CSV (§5c.5-6) | cambiar el % de reventa recalcula el neto sin nueva llamada a la IA (se ve en `ai_runs`); un cambio de prioridad deja el plan anterior idéntico; un combo muestra la diferencia contra la suma de sueltos; el CSV abre en una hoja de cálculo |
| **3** | **Proyección de precios a 3-6 meses** (`price_projections`, §4b.5): probabilidad de suba/estable/baja con noticias de la semana (memoria por IA, lanzamientos) y dólar/REM, siempre marcada estimación y con las noticias citadas; alertas de baja; ML por API si resulta viable; XLSX | una proyección sin noticia citada no se guarda; cada proyección muestra fuentes y fecha |

**Proyección de precios (ítem 35): FUERA DEL MVP, Fase 3.** Motivo: depende de fuentes de noticias y de dólar/REM que no se eligieron ni se probaron (cuáles y con qué términos de uso: **sin verificar**) y de tener historial acumulado para que la probabilidad no sea inventada. El modelo de datos ya está previsto (§4b.5) para no migrar después. Mientras tanto, el cartel de §5b.7 cubre la pregunta práctica "¿espero a la próxima fecha de ofertas?".

---

## 7. Riesgos, incógnitas y costos mensuales

### Riesgos e incógnitas
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Tiendas bloquean IPs de Vercel (FullH4rd ya dio 403 al fetch simple) | Faltan precios | Adaptador con fallback a servicio externo; carga manual siempre disponible |
| Cambios de HTML en las tiendas | Parseo roto | Extracción con Haiku en vez de selectores fijos; tests de humo por tienda |
| Chromium excede 250 MB o falla en frío | Opción A inviable | Usar servicio externo (Opción B) como primario |
| Supabase Free pausa proyectos tras 1 semana sin actividad y permite 2 proyectos activos (https://supabase.com/pricing) | App "muerta" si no se usa | Aceptable para uso personal; pasar a Pro ($25/mes) si molesta. Que un cron diario cuente como actividad: **sin verificar** |
| Free de Supabase: 500 MB de DB, 5 GB egress, 1 GB storage (https://supabase.com/pricing) | Cubierto para un usuario; el texto de snapshots es chico | Revisar tamaño tras 3 meses (estimación de volumen **sin verificar**) |
| Índices de rendimiento "estimados" mal calibrados | Recomendaciones engañosas | Marcar siempre como estimado; fijar fuente de benchmark (decisión pendiente) |
| Respuesta de la IA sin fundamento | Datos inventados | Precios solo desde snapshots; salida JSON validada; citas de fuente en compatibilidad |
| Términos de uso de tiendas y scraping | Legal/bloqueo | Uso personal, bajo volumen; revisar ToS (**sin verificar**) |
| Hobby de Vercel y uso comercial | Si la app se vuelve pública/comercial puede requerir Pro | Condición del plan Hobby respecto a uso comercial: **sin verificar** |
| Latencia: función en `iad1` por defecto, DB en otra región | Lentitud | Fijar región de la función cerca de la DB (https://vercel.com/docs/functions/limitations) |

### Costos mensuales estimados (USD, sin IVA)
| Ítem | Mínimo | Con fallback pago | Fuente |
|---|---|---|---|
| Vercel | $0 (Hobby) | $20 (Pro, solo si hace falta cron frecuente, 800 s o large functions) | https://vercel.com/pricing |
| Supabase | $0 (Free) | $25 (Pro) | https://supabase.com/pricing |
| API de IA | ~$1-5 | ~$10 | https://docs.anthropic.com/en/docs/about-claude/pricing |
| Scraping | $0 (fetch directo + Firecrawl Free 1.000 créditos) | $16-19 (Firecrawl Hobby) o $19 (ScrapingBee Hobby) o $25 (Browserless Prototyping) | URLs de la sección 3.2 |
| **Total** | **≈ $1-5** | **≈ $45-80** | |

Cómo salió el costo de IA (estimación mía, no un dato de fuente): una investigación con ~50.000 tokens de entrada y ~10.000 de salida en Sonnet 5.5 da unos $0,10 + $0,10 = $0,20. Con 10-20 investigaciones al mes, ~$2-4. Pasar de ahí depende del tamaño real de los prompts: **sin verificar** hasta medir en Fase 1. Nota: los modelos 4.7 en adelante usan un tokenizador que genera ~30% más tokens (misma página de precios); ya está dentro del margen del estimado.

---

## 8. Qué necesita el Commander para arrancar

**Cuentas (las crea él; yo no puedo ni debo)**
1. Cuenta de Vercel (plan Hobby alcanza para arrancar) y una cuenta de GitHub para conectar el repo.
2. Proyecto de Supabase (Free).
3. Clave de API de Anthropic con crédito cargado.
4. (Opcional, Fase 0) cuenta Free de Firecrawl o Browserless para probar Compra Gamer.

**Decisiones pendientes**
1. Fuente del índice de rendimiento (¿benchmarks públicos que él prefiera, o estimación de la IA marcada como tal?).
2. ¿Mercado Libre manual en el MVP? (recomendado: sí).
3. ¿Aceptamos pasar a un servicio de scraping pago si el gratuito no alcanza (~$16-25/mes)?
4. Login: ¿magic link por email o email+clave?
5. Dominio propio o alcanza con la URL `*.vercel.app`.
6. ¿El primer caso de prueba real es una GPU u otro componente? (Para validar en Fase 1.)

**Qué ítems de la v2 dependen de cada decisión (no se decidieron; se dejan las dos alternativas):**
- Decisión 1 (fuente del índice): ítems 27-29, 32 y 33. Alternativa A = benchmarks públicos elegidos por el Commander; alternativa B = estimación de la IA marcada. Ver §5b.6.
- Decisión 2 (Mercado Libre manual): ítems 21 y 23. Si **sí**, ML queda con carga manual y botón a MejoresCompras (§5b.4); si **no**, hay que investigar la API oficial de ML antes de Fase 2 (§3.2, **sin verificar**).
- Decisión 3 (servicio de scraping pago): ítem 26. Con servicio pago bajan las búsquedas interrumpidas por bloqueo; sin él, más filas "no confirmado" y más carga manual (§5b.4).
- Decisión 6 (primer caso real): ítem 22. Si es GPU, el combo GPU + fuente es el caso de prueba natural (§5b.5); si es otro componente, se elige otro combo.
- Decisiones 4 y 5 (login, dominio): sin impacto en los ítems de la receta.
- Fuera de las 6: elegir fuentes de noticias y dólar/REM para la proyección (Fase 3, ítem 35) y confirmar CSV vs. XLSX (§5c.6).

**Lo que arranco apenas dé la orden:** Fase 0 completa, empezando por el test de las 4 tiendas desde Vercel.

---

## 9. Cobertura de la receta

Auditoría de los 42 ítems del checklist contra este documento. Estado: **YA CUBIERTO §x** (estaba en la v1 y no se tocó), **AGREGADO §x** (nuevo o ampliado en la v2) o **FUERA DEL MVP** (con motivo y fase).

| # | Ítem | Estado |
|---|---|---|
| 1 | Hardware completo (CPU, GPU+VRAM, mother+BIOS, RAM módulos/velocidad real/slots, fuente, almacenamiento/M.2, cooler, gabinete, monitor) | AGREGADO §4b.1 y §5b.1 |
| 2 | Ayuda "cómo averiguarlo" por campo (CPU-Z, BIOS, placa) | AGREGADO §5b.1 y §4b.2 (`field_help`) |
| 3 | Usos con resolución y títulos, y cuál manda | AGREGADO §4b.1 y §5b.1 |
| 4 | Componentes, presupuesto o gama por componente, usados/importados | AGREGADO §4b.1 (gama y aceptación por componente) y §5b.1 |
| 5 | Plazo: ahora / próxima fecha de ofertas / 3-6 meses | YA CUBIERTO §4 (`deadline_kind`); uso en §5b.7 |
| 6 | Precios escritos junto al hardware se ignoran | AGREGADO §5b.1 |
| 7 | Monitor faltante: la app declara qué supuso | AGREGADO §5b.1 y §4b.1 |
| 8 | No arranca sin hardware, componentes y presupuesto | YA CUBIERTO §1 y §5 (detalle de campos mínimos en §5b.1) |
| 9 | Cambio de prioridad crea plan alternativo sin pisar el anterior | AGREGADO §4b.1/§4b.4 y §5b.1 |
| 10 | Socket/plataforma y costo de cambiar mother+RAM | AGREGADO §5b.2 |
| 11 | BIOS mínima desde lista oficial; no listada = "verificar"; cómo actualizar | AGREGADO §5b.2 y §4b.2 |
| 12 | PCIe por slot y M.2; GPU x8 en 3.0; Ryzen 5000G en 3.0 | AGREGADO §5b.2 |
| 13 | RAM: slots, dual channel A2/B2, no mezclar kits | AGREGADO §5b.2 |
| 14 | Fuente: watts con margen, conectores, certificación | AGREGADO §5b.2 |
| 15 | Largo de GPU y altura de cooler vs. gabinete | YA CUBIERTO §4 (`case_max_*`) y §5; datos de referencia en §4b.2 |
| 16 | CPU sin cooler: costo del cooler en columna propia | AGREGADO §5b.2, §4b.3 y §5c.1 |
| 17 | Aviso en opciones sin video integrado si no hay GPU | AGREGADO §5b.2 |
| 18 | VRM: comparar watts de cada mother antes de recomendar cambio | AGREGADO §5b.2 y §4b.2 (cobertura limitada de datos, nota de MaxMyBuild) |
| 19 | Dónde se guardan y de dónde salen los datos de referencia | AGREGADO §4b.2 |
| 20 | Sin precio de memoria ni link inventado; fecha y hora por medición | YA CUBIERTO §2 (regla 1) y §4 (`captured_at`, `url`); refuerzo en §5b.3 y §5b.4 |
| 21 | mejorescompras.com.ar como referencia de ML + aviso de riesgos de importados | AGREGADO §5b.4 |
| 22 | COMBOS (ej. GPU+fuente): cómo se detectan y muestran | AGREGADO §5b.5 y §4b.3 (`combos`, `combo_items`); Fase 2 (§6b) |
| 23 | Precio de lista y final, % OFF, fechas especiales, comparar entre tiendas | AGREGADO §5b.4 punto 3, §4b.3 y §4b.5 |
| 24 | Variantes BULK, XT/no XT, VRAM, reediciones | AGREGADO §4b.3 y §5b.4 punto 4 |
| 25 | Búsquedas separadas por capacidad; 3-6 opciones + una superior | AGREGADO §4b.1/§4b.3 y §5b.4 punto 5 |
| 26 | Búsqueda interrumpida: guardar lo obtenido y marcar lo no confirmado | AGREGADO §4b.3 y §5b.4 punto 6 |
| 27 | Índice de rendimiento base 100 marcado como estimación (fuente: decisión pendiente) | YA CUBIERTO §2 (regla 2), §4 (`perf_index_is_estimate`) y §8 decisión 1; alternativas en §5b.6 |
| 28 | Precio por rendimiento y precio por TB | YA CUBIERTO §1, §4 (notas) y §6 Fase 2; fórmulas en §5b.6 |
| 29 | Plan por etapas: % por etapa, acumulado, orden recomendado vs. alternativo, cuellos 1080p/1440p y no gaming | AGREGADO §4b.4 y §5b.6 |
| 30 | Complementación entre piezas | AGREGADO §4b.4 y §5b.6 |
| 31 | Costo neto = precio − reventa estimada (supuesto editable) | YA CUBIERTO §1 y §4 (`net_cost_ars`, `resale_value_ars`); editable en §5c.3 |
| 32 | IA local: VRAM, CUDA/ROCm, RAM, disco | AGREGADO §5b.6 |
| 33 | Producción musical: núcleos y caché, GPU no aporta, RAM si se llena, LatencyMon | AGREGADO §5b.6 |
| 34 | Vida útil y riesgo (garantía, importación, vendedor) | AGREGADO §4b.3 y §5b.6 |
| 35 | Proyección de precios a 3-6 meses (probabilidad, noticias, dólar/REM) | FUERA DEL MVP: motivo y Fase 3 en §6b; modelo de datos previsto en §4b.5 |
| 36 | Próximas fechas de ofertas reales y si conviene esperar | AGREGADO §4b.5 (calendario con fechas) y §5b.7 |
| 37 | Vistas: resumen, tabla por componente con fila resaltada, plan con gráficos, recomendación numerada con fecha | AGREGADO §5c.1 y §5c.2 |
| 38 | Supuestos editables que recalculan métricas | AGREGADO §5c.3 y §4b.1 |
| 39 | ARS `$#,##0`, locale es-AR, zona Buenos Aires | AGREGADO §5c.5 (locale y zona ya estaban en el encabezado) |
| 40 | Cierre: recomendación, orden de compra y un solo próximo paso | AGREGADO §5c.4 y §4b.1 |
| 41 | Una investigación nueva puede sumarse a una anterior | AGREGADO §5b.8 y §4b.1 (`parent_research_id`) |
| 42 | Export CSV (confirmar) | YA CUBIERTO §1, §5 y §6 Fase 2; detalle y pendiente de confirmar en §5c.6 |

**Conteo:** YA CUBIERTO 8 (ítems 5, 8, 15, 20, 27, 28, 31, 42) · AGREGADO 33 · FUERA DEL MVP 1 (ítem 35) · Total 42.

---

## Anexo: fuentes consultadas hoy (2026-11-14)
- Vercel límites de funciones: https://vercel.com/docs/functions/limitations
- Vercel precios: https://vercel.com/pricing
- Vercel Cron (Hobby 1/día): https://vercel.com/docs/cron-jobs/usage-and-pricing
- Supabase precios: https://supabase.com/pricing
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Anthropic precios: https://docs.anthropic.com/en/docs/about-claude/pricing
- @sparticuz/chromium: https://github.com/Sparticuz/chromium
- Firecrawl: https://www.firecrawl.dev/pricing
- ScrapingBee: https://www.scrapingbee.com/pricing/
- Browserless: https://www.browserless.io/pricing
- Venex (prueba): https://www.venex.com.ar/resultado-busqueda.htm?keywords=rtx&order=price_asc
- Compra Gamer (prueba con navegador): https://compragamer.com/productos?criterio=rtx%203060
- FullH4rd (prueba): https://fullh4rd.com.ar/
- Gezatek (prueba): https://www.gezatek.com.ar/
- Mercado Libre (prueba, pide login): https://listado.mercadolibre.com.ar/placa-de-video-rtx-3060
- Mercado Libre developers: https://developers.mercadolibre.com.ar/en_us/api-docs
- v2 · MaxMyBuild (VRM, cobertura de sockets, precios US/DE/UK): https://maxmybuild.com
- v2 · MejoresCompras (historial de ML, descuentos reales): https://mejorescompras.com.ar
- v2 · CyberMonday y Black Friday 2026 (CACE): https://www.ambito.com/economia/confirmaron-las-fechas-del-black-friday-y-cyber-monday-2026-n6326087 , https://sentidonacional.com/2026/09/24/confirmaron-fechas-black-friday-cyber-monday-2026/
- v2 · Hot Sale 2026 (CACE): https://cace.org.ar/blogs/news/hot-sale-2026-mas-de-800-marcas-se-preparan-para-impulsar-el-consumo-digital

Nota de proceso: el archivo original de la receta (`investigacion-upgrade-pc_SKILL.md`) no apareció en mi workspace (`fs_search` sin resultados); trabajé con el resumen que pasó NASUS.
