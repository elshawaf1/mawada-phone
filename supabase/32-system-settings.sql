-- Mawada Phone - 32. SYSTEM SETTINGS
-- ============================================
-- System-wide configurable values (delivery fees, thresholds, etc.)
-- ============================================

CREATE TABLE public.system_settings (
  id text PRIMARY KEY DEFAULT ('set_' || encode(gen_random_bytes(8), 'hex')),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  label_en text,
  description text,
  description_en text,
  value numeric NOT NULL DEFAULT 0,
  type text DEFAULT 'number' CHECK (type IN ('number', 'boolean', 'string')),
  group_name text DEFAULT 'general',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SEED DEFAULT VALUES
-- ============================================
INSERT INTO public.system_settings (key, label, label_en, description, description_en, value, type, group_name, sort_order) VALUES
('delivery_fee', 'رسوم التوصيل', 'Delivery Fee', 'تكلفة التوصيل للمنزل (جنيه)', 'Home delivery cost (EGP)', 90, 'number', 'shipping', 1),
('free_shipping_threshold', 'حد الشحن المجاني', 'Free Shipping Threshold', 'الحد الأدنى للطلب للشحن المجاني (جنيه)', 'Minimum order for free shipping (EGP)', 50000, 'number', 'shipping', 2),
('branch_pickup_fee', 'رسوم الاستلام من الفرع', 'Branch Pickup Fee', 'تكلفة الاستلام من الفرع (جنيه)', 'Branch pickup cost (EGP)', 0, 'number', 'shipping', 3),
('estimated_delivery_days', 'مدة التوصيل التقريبية', 'Estimated Delivery Days', 'عدد أيام التوصيل التقريبية', 'Estimated delivery time in days', 3, 'number', 'shipping', 4),
('cod_fee', 'رسوم الدفع عند الاستلام', 'COD Fee', 'رسوم إضافية للدفع عند الاستلام (جنيه)', 'Additional fee for cash on delivery (EGP)', 0, 'number', 'payment', 5),
('min_order_amount', 'الحد الأدنى للطلب', 'Minimum Order Amount', 'الحد الأدنى لقيمة الطلب (جنيه)', 'Minimum order value (EGP)', 0, 'number', 'payment', 6),
('max_cod_amount', 'حد الدفع عند الاستلام', 'Max COD Amount', 'أقصى مبلغ مسموح بالدفع عند الاستلام (جنيه)', 'Maximum amount for COD payment (EGP)', 0, 'number', 'payment', 7),
('tax_rate', 'معدل الضريبة الافتراضي', 'Default Tax Rate', 'نسبة الضريبة الافتراضية (%)', 'Default tax rate (%)', 0, 'number', 'tax', 8),
('phone_whatsapp', 'رقم واتساب', 'WhatsApp Phone', 'رقم التواصل عبر واتساب', 'WhatsApp contact number', 0, 'number', 'contact', 9),
('phone_support', 'رقم الدعم', 'Support Phone', 'رقم خط الدعم', 'Support hotline number', 0, 'number', 'contact', 10);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Public read for active settings (mobile app can fetch)
CREATE POLICY "Public read active settings" ON public.system_settings
  FOR SELECT USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_system_settings_key ON public.system_settings(key);
CREATE INDEX idx_system_settings_group ON public.system_settings(group_name);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_system_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_timestamp();
