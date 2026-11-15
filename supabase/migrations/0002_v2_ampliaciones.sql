-- pcUpgradeAPP · 0002_v2_ampliaciones · plan v2 §4b.
-- Orden (§4b.6): tablas nuevas 4b.2/4b.3 -> alter 4b.1/4b.3/4b.4 -> RLS 4b.6.
-- SIN price_projections (§4b.5): queda para Fase 3, no entra en esta migración.
-- NO ejecutado todavía: falta el proyecto de Supabase. Requiere 0001 aplicada antes.

-- ============================================================
-- 1) Tablas nuevas
-- ============================================================

-- 4b.2 Datos de referencia (compartida; escribe solo el service role)
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

-- 4b.3 Calendario de ofertas (compartida)
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

-- ============================================================
-- 2) Alter de tablas existentes
-- ============================================================

-- 4b.1 A. Hardware: campos para la compatibilidad fina
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

-- 4b.1 B. Investigación: usos con detalle, supuestos editables, cierre, encadenado
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

-- 4b.1 C. Componentes: gama, usados/importados por componente, búsquedas separadas, estado de precios
alter table public.research_components
  add column tier text check (tier in ('entry','mid','high')),
  add column accepts_used boolean,                   -- null = hereda de researches
  add column accepts_imported boolean,
  add column search_scope text not null default 'general' check (search_scope in ('general','capacity')),
  add column capacity_filter_tb numeric(6,2),        -- ej. 2 para la búsqueda "2tb" de SSD
  add column pricing_status text not null default 'pending'
    check (pricing_status in ('pending','running','partial','done','interrupted'));

-- 4b.1 D. Compatibilidad: estado "verificar" (dato no listado / no comprobado)
-- (se agrega "if exists": los nombres por defecto de constraint eran una suposición del plan)
alter table public.compat_checks drop constraint if exists compat_checks_severity_check;
alter table public.compat_checks add constraint compat_checks_severity_check
  check (severity in ('info','warning','blocker','verify'));
alter table public.research_components drop constraint if exists research_components_compat_status_check;
alter table public.research_components add constraint research_components_compat_status_check
  check (compat_status in ('unchecked','ok','warning','verify','blocked'));

-- 4b.3 Candidatos: variantes, cooler aparte, video integrado, opción superior, rendimiento por uso
alter table public.candidates
  add column variant jsonb not null default '{}'::jsonb,       -- {bulk,xt,vram_gb,reissue_of,oem}
  add column includes_cooler boolean,                          -- false => costo del cooler en columna propia
  add column cooler_candidate_id uuid references public.candidates(id) on delete set null,
  add column has_igpu boolean,
  add column is_superior_option boolean not null default false,
  add column superior_justification text,
  add column perf_by_use jsonb not null default '{}'::jsonb;   -- {gaming_1080p,gaming_1440p,ia_local,music,edit}

-- 4b.3 Cada medición: oferta, evento, riesgo y confirmación
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

-- 4b.4 Planes: etiqueta, prioridades propias, plan padre, orden, fecha de precios
alter table public.upgrade_plans
  add column label text,
  add column priorities jsonb not null default '{}'::jsonb,    -- prioridad con la que se armó ESTE plan
  add column parent_plan_id uuid references public.upgrade_plans(id) on delete set null,
  add column order_kind text check (order_kind in ('recommended_order','alternative_order')),
  add column prices_as_of timestamptz;                         -- fecha y hora de los precios usados

-- 4b.4 Etapas: mejora por etapa, reventa, cuellos de botella, complementos
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

-- ============================================================
-- 3) RLS de las tablas nuevas (4b.6, sin price_projections)
-- ============================================================
do $$
declare t text;
begin
  -- del usuario: mismo patrón que 0001
  foreach t in array array['combos','combo_items','price_fetch_runs'] loop
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
