-- pcUpgradeAPP · seed.sql · T-002 (Fase 0)
-- Datos iniciales: calendario de ofertas y ayudas de formulario ("cómo averiguarlo").
-- Requiere 0001_base.sql y 0002_v2_ampliaciones.sql aplicadas antes.
-- NO ejecutado todavía: falta el proyecto de Supabase.

-- ============================================================
-- 1) Calendario de ofertas (sale_calendar)
-- ============================================================
insert into public.sale_calendar (name, starts_on, ends_on, source_url, confirmed) values
  ('CyberMonday 2026', '2026-11-02', '2026-11-04',
   'https://www.ambito.com/economia/confirmaron-las-fechas-del-black-friday-y-cyber-monday-2026-n6326087', false),
  ('Black Friday 2026', '2026-11-27', '2026-11-27',
   'https://www.ambito.com/economia/confirmaron-las-fechas-del-black-friday-y-cyber-monday-2026-n6326087', false),
  ('Hot Sale 2026', '2026-05-11', '2026-05-13',
   'https://cace.org.ar/blogs/news/hot-sale-2026-mas-de-800-marcas-se-preparan-para-impulsar-el-consumo-digital', false),
  ('11.11 2026', '2026-11-11', '2026-11-11',
   'sin fuente consultada', false)
on conflict do nothing;

-- ============================================================
-- 2) Ayudas de formulario (reference_data, kind = 'field_help')
-- ============================================================
insert into public.reference_data (kind, key, data, source_url, source_kind, verified) values
  ('field_help', 'ram_real_speed',
   '{"texto": "La velocidad real es la que usa la RAM ahora, no la nominal del módulo. Se ve en CPU-Z, pestañas Memory y SPD."}',
   'interno:pcupgradeapp', 'manual', false),
  ('field_help', 'ram_modules',
   '{"texto": "Anotá cada módulo: capacidad, tipo (DDR4 o DDR5), velocidad y slot donde está. Se ve en CPU-Z, pestaña SPD, con el selector de slot."}',
   'interno:pcupgradeapp', 'manual', false),
  ('field_help', 'bios_version',
   '{"texto": "La versión de BIOS aparece en la pantalla de BIOS al arrancar, o en CPU-Z, pestaña Mainboard."}',
   'interno:pcupgradeapp', 'manual', false),
  ('field_help', 'motherboard_model',
   '{"texto": "El modelo de la mother está impreso en la placa, generalmente entre el socket y los slots de RAM. También figura en CPU-Z, pestaña Mainboard."}',
   'interno:pcupgradeapp', 'manual', false),
  ('field_help', 'gpu_model',
   '{"texto": "Anotá el modelo exacto de la placa de video y su VRAM. Figura en la caja, en la etiqueta de la placa o en GPU-Z."}',
   'interno:pcupgradeapp', 'manual', false),
  ('field_help', 'psu',
   '{"texto": "Anotá la potencia en W, la certificación y los conectores (8 pines, 12V-2x6). Está en la etiqueta de la fuente y en la ficha del fabricante."}',
   'interno:pcupgradeapp', 'manual', false),
  ('field_help', 'case_max_gpu',
   '{"texto": "Es el largo máximo de GPU que entra en el gabinete. Está en la ficha oficial del gabinete; si no la encontrás, marcalo como desconocido."}',
   'interno:pcupgradeapp', 'manual', false)
on conflict do nothing;
