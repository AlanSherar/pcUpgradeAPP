-- pcUpgradeAPP · 0001_base · esquema inicial (plan v2 §4, copiado tal cual).
-- NO ejecutado todavía: falta el proyecto de Supabase.

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
