# T-002 — pcUpgradeAPP · Fase 0: seeds de calendario y ayudas de formulario
Complejidad: BAJA · Asignado a: TEEMO · Fecha: 2026-11-14 · Corre DESPUÉS de T-001

## Objetivo
Crear `supabase/seed.sql` en E:\Software\StarNet\Proyectos\PCupgradeAPP con:
1. `insert into public.sale_calendar (name, starts_on, ends_on, source_url, confirmed)` con las 4 filas de la tabla de §4b.5 del plan. Usar exactamente estas:
   - CyberMonday 2026: 2026-11-02 a 2026-11-04, https://www.ambito.com/economia/confirmaron-las-fechas-del-black-friday-y-cyber-monday-2026-n6326087, confirmed false
   - Black Friday 2026: 2026-11-27 a 2026-11-27, misma URL, confirmed false
   - Hot Sale 2026: 2026-05-11 a 2026-05-13, https://cace.org.ar/blogs/news/hot-sale-2026-mas-de-800-marcas-se-preparan-para-impulsar-el-consumo-digital, confirmed false
   - 11.11 2026: 2026-11-11 a 2026-11-11, source_url 'sin fuente consultada', confirmed false
2. `insert into public.reference_data (kind, key, data, source_url, source_kind, verified)` con `kind='field_help'`, `source_kind='manual'`, `verified=false`, `source_url='interno:pcupgradeapp'`, una fila por campo: ram_real_speed, ram_modules, bios_version, motherboard_model, gpu_model, psu, case_max_gpu. `data` = `{"texto": "..."}` en español rioplatense, una o dos oraciones, según §5b.1 (CPU-Z pestañas Memory/SPD, Mainboard; pantalla de BIOS; impreso en la placa; etiqueta de la fuente; ficha del gabinete).
Usar `on conflict do nothing`.

## Límites
Solo crear ese archivo. No tocar nada más del repo. No inventar fechas ni URLs fuera de las dadas.

## Criterio de terminado
El archivo existe, es SQL válido a simple vista, columnas coinciden con `supabase/migrations/0002_v2_ampliaciones.sql` (leelo para chequear).

## Formato de reporte
HECHO / PARCIAL / BLOQUEADO, ruta del archivo, cantidad de filas por tabla.
