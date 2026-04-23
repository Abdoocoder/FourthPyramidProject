-- =============================================================================
-- FOURTH PYRAMID INDUSTRIAL ECOSYSTEM — SEED DATA
-- Migration: 004 — Initial seed for categories and demo products
-- NOTE: Run this ONLY on development/staging environments
-- =============================================================================

-- =============================================================================
-- CREATE A SEED ADMIN USER (via Supabase Auth - do this via dashboard or API)
-- Then update role here:
-- UPDATE public.profiles SET role = 'admin' WHERE id = '<your-user-uuid>';
-- =============================================================================

-- =============================================================================
-- CATEGORIES
-- =============================================================================

INSERT INTO public.categories (name_ar, name_en, slug, description, icon, sort_order) VALUES
  ('مواسير', 'Pipes', 'pipes', 'HDPE, PVC, PPR pipes of all diameters and pressure ratings', 'pipe', 1),
  ('تركيبات وقواطع', 'Fittings & Couplings', 'fittings', 'Elbows, tees, reducers, and all pipe fittings', 'connector', 2),
  ('أكياس وتعبئة', 'Bags & Packaging', 'bags', 'Industrial and agricultural plastic bags, sacks, and packaging materials', 'bag', 3),
  ('صفائح وألواح', 'Sheets & Boards', 'sheets', 'PP, PE, and PVC plastic sheets for industrial use', 'layers', 4),
  ('خامات بلاستيكية', 'Raw Materials', 'raw-materials', 'Granules, pellets, and polymer raw materials', 'grain', 5),
  ('منتجات زراعية', 'Agricultural Products', 'agricultural', 'Drip irrigation, mulch film, greenhouse covers', 'leaf', 6),
  ('حاويات وخزانات', 'Containers & Tanks', 'containers', 'Water tanks, storage drums, industrial containers', 'cylinder', 7),
  ('أخرى', 'Other', 'other', 'Miscellaneous plastic products', 'box', 8);

-- =============================================================================
-- PRODUCTS (demo products covering each category)
-- =============================================================================

-- Note: These use category slugs via a subquery for readability
INSERT INTO public.products (
  category_id, sku, name_ar, name_en, slug,
  description_ar, description_en,
  specifications, base_price, currency, unit_type,
  min_order_quantity, stock_quantity, is_in_stock,
  is_featured, tags
)
VALUES
-- PIPES -----------------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'pipes'),
  'PP-HDPE-110-6',
  'ماسورة HDPE 110 مم - بار 6',
  'HDPE Pipe 110mm PN6',
  'hdpe-pipe-110mm-pn6',
  'ماسورة بولي إيثيلين عالي الكثافة ذات قطر 110 مم مقاومة للضغط 6 بار، مناسبة للمياه والصرف الزراعي.',
  'High-density polyethylene pipe, 110mm diameter, PN6 pressure rating. Ideal for water supply and agricultural irrigation.',
  '{"diameter_mm": 110, "pressure_bar": 6, "wall_thickness_mm": 4.2, "length_m": 6, "material": "HDPE PE100", "color": "Black with blue stripe", "standard": "ISO 4427"}',
  285.00, 'EGP', 'meter', 100, 5000, TRUE, TRUE,
  ARRAY['HDPE','pipes','water-supply','irrigation','PN6']
),
(
  (SELECT id FROM public.categories WHERE slug = 'pipes'),
  'PP-PVC-160-10',
  'ماسورة PVC 160 مم - بار 10',
  'PVC Pressure Pipe 160mm PN10',
  'pvc-pipe-160mm-pn10',
  'ماسورة PVC للضغط قطر 160 مم مقاومة 10 بار، للاستخدامات الصناعية وشبكات المياه.',
  'PVC pressure pipe, 160mm, PN10. Suitable for industrial water networks and main supply lines.',
  '{"diameter_mm": 160, "pressure_bar": 10, "wall_thickness_mm": 7.7, "length_m": 6, "material": "uPVC", "color": "Grey", "standard": "ISO 1452"}',
  420.00, 'EGP', 'meter', 50, 2000, TRUE, FALSE,
  ARRAY['PVC','pipes','pressure','industrial']
),
(
  (SELECT id FROM public.categories WHERE slug = 'pipes'),
  'PP-PPR-32-20',
  'ماسورة PPR 32 مم - بار 20',
  'PPR Pipe 32mm PN20',
  'ppr-pipe-32mm-pn20',
  'ماسورة بولي بروبيلين 32 مم مناسبة للمياه الساخنة والباردة في المباني.',
  'PPR hot & cold water pipe, 32mm, PN20 rated. For plumbing in residential and commercial buildings.',
  '{"diameter_mm": 32, "pressure_bar": 20, "length_m": 4, "material": "PPR Type 3", "color": "Green", "max_temp_c": 95, "standard": "DIN 8077"}',
  68.00, 'EGP', 'meter', 200, 8000, TRUE, FALSE,
  ARRAY['PPR','pipes','hot-water','plumbing']
),

-- FITTINGS --------------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'fittings'),
  'FT-ELB-110-90',
  'كوع HDPE 110 مم - 90 درجة',
  'HDPE Elbow 110mm 90°',
  'hdpe-elbow-110mm-90deg',
  'كوع HDPE بضغط 6 بار قطر 110 مم بزاوية 90 درجة.',
  'HDPE butt fusion elbow, 110mm, 90 degrees, PN6 compatible.',
  '{"diameter_mm": 110, "angle_deg": 90, "material": "HDPE PE100", "connection": "Butt Fusion", "pressure_bar": 6}',
  85.00, 'EGP', 'piece', 10, 500, TRUE, FALSE,
  ARRAY['fittings','HDPE','elbow','110mm']
),
(
  (SELECT id FROM public.categories WHERE slug = 'fittings'),
  'FT-TEE-110',
  'تيه HDPE 110 مم مستوي',
  'HDPE Equal Tee 110mm',
  'hdpe-equal-tee-110mm',
  'تيه HDPE متساوي الأطراف قطر 110 مم للربط بالانصهار.',
  'HDPE butt-weld equal tee, 110mm, for water distribution networks.',
  '{"diameter_mm": 110, "material": "HDPE PE100", "connection": "Butt Fusion", "pressure_bar": 6}',
  145.00, 'EGP', 'piece', 5, 300, TRUE, FALSE,
  ARRAY['fittings','HDPE','tee','110mm']
),

-- BAGS -----------------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'bags'),
  'BG-WOVEN-50KG',
  'كيس بولي بروبيلين 50 كيلو',
  'PP Woven Sack 50kg',
  'pp-woven-sack-50kg',
  'كيس نسيج بولي بروبيلين سعة 50 كيلوجرام، مناسب للحبوب والأسمدة والمواد الصوائب.',
  'PP woven sack, 50kg capacity. Suitable for grains, fertilizers, and granular materials.',
  '{"capacity_kg": 50, "material": "PP Woven", "dimensions_cm": "55x90", "gsm": 80, "uv_treated": true, "laminated": false}',
  NULL, 'EGP', 'piece', 1000, 50000, TRUE, TRUE,
  ARRAY['bags','woven','PP','sack','agriculture']
),
(
  (SELECT id FROM public.categories WHERE slug = 'bags'),
  'BG-LDPE-ROLL',
  'لفة نايلون LDPE شفافة',
  'LDPE Clear Plastic Roll',
  'ldpe-clear-plastic-roll',
  'لفة بلاستيك LDPE شفافة للاستخدامات الزراعية والتعبئة.',
  'Clear LDPE polyethylene film roll for agricultural and packaging use.',
  '{"width_mm": 1000, "thickness_micron": 200, "length_m": 100, "material": "LDPE", "color": "Clear"}',
  320.00, 'EGP', 'roll', 10, 1000, TRUE, FALSE,
  ARRAY['bags','LDPE','film','roll','packaging']
),

-- SHEETS ---------------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'sheets'),
  'SH-PP-1000x2000-3MM',
  'لوح بولي بروبيلين 3 مم - 100×200 سم',
  'PP Sheet 3mm 1000x2000mm',
  'pp-sheet-3mm-1000x2000',
  'لوح بلاستيك PP أبيض سماكة 3 مم مقاس 100×200 سم للتصنيع الصناعي.',
  'White PP polypropylene sheet, 3mm thick, 1000x2000mm. For industrial fabrication and food-grade applications.',
  '{"thickness_mm": 3, "width_mm": 1000, "length_mm": 2000, "material": "PP Homopolymer", "color": "White", "food_grade": true}',
  195.00, 'EGP', 'piece', 20, 800, TRUE, FALSE,
  ARRAY['sheets','PP','food-grade','fabrication']
),

-- RAW MATERIALS ---------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'raw-materials'),
  'RM-HDPE-GRAN-PN80',
  'حبيبات HDPE PE80',
  'HDPE Granules PE80',
  'hdpe-granules-pe80',
  'حبيبات بولي إيثيلين عالي الكثافة PE80 للتصنيع.',
  'HDPE PE80 granules / pellets for pipe and sheet extrusion.',
  '{"grade": "PE80", "MFI": "0.3 g/10min", "density_g_cm3": 0.944, "color": "Natural/Black", "packaging": "25kg bags"}',
  28500.00, 'EGP', 'ton', 1, 100, TRUE, FALSE,
  ARRAY['raw-materials','HDPE','granules','PE80']
),

-- AGRICULTURAL ----------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'agricultural'),
  'AG-DRIP-16MM-30CM',
  'خرطوم ري بالتنقيط 16 مم - 30 سم',
  'Drip Irrigation Tape 16mm 30cm spacing',
  'drip-irrigation-tape-16mm-30cm',
  'خرطوم ري بالتنقيط مُدمج قطر 16 مم مسافة بين النقاطات 30 سم.',
  'Drip irrigation tape with integrated emitters, 16mm, 30cm emitter spacing, 1.6 L/hr flow.',
  '{"diameter_mm": 16, "emitter_spacing_cm": 30, "flow_lph": 1.6, "wall_thickness_mm": 0.2, "length_m": 1000, "operating_pressure_bar": "0.5-1.5"}',
  780.00, 'EGP', 'roll', 5, 200, TRUE, TRUE,
  ARRAY['agricultural','drip','irrigation','tape']
),

-- CONTAINERS ------------------------------------------------------------------
(
  (SELECT id FROM public.categories WHERE slug = 'containers'),
  'CT-TANK-1000L',
  'خزان مياه 1000 لتر - أسود',
  'Water Tank 1000L Black',
  'water-tank-1000l-black',
  'خزان مياه بلاستيكي أسود سعة 1000 لتر مُصنَّع من HDPE.',
  'Black HDPE water storage tank, 1000 liters. UV stabilized, food-grade approved.',
  '{"capacity_liters": 1000, "material": "HDPE", "color": "Black", "uv_stabilized": true, "food_grade": true, "layers": 3, "diameter_cm": 102, "height_cm": 135}',
  NULL, 'EGP', 'piece', 1, 45, TRUE, TRUE,
  ARRAY['containers','tank','water','HDPE','1000L']
);

-- Mark price_on_request for tanks (they're NULL base_price)
UPDATE public.products SET price_on_request = TRUE WHERE base_price IS NULL;
