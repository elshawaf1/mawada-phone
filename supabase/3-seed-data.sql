-- Mawada Phone - 3. SEED DATA (Run Third)

-- BRANDS
INSERT INTO public.brands (id, name, "nameAr", slug, "isActive", "sortOrder") VALUES
  ('brand-apple', 'Apple', 'ابل', 'apple', true, 1),
  ('brand-samsung', 'Samsung', 'سامسونج', 'samsung', true, 2),
  ('brand-huawei', 'Huawei', 'هواوي', 'huawei', true, 3),
  ('brand-xiaomi', 'Xiaomi', 'شاومي', 'xiaomi', true, 4),
  ('brand-oppo', 'OPPO', 'اوبو', 'oppo', true, 5),
  ('brand-vivo', 'Vivo', 'فيفو', 'vivo', true, 6),
  ('brand-realme', 'Realme', 'ريلمي', 'realme', true, 7),
  ('brand-nokia', 'Nokia', 'نوكيا', 'nokia', true, 8),
  ('brand-honor', 'Honor', 'هونر', 'honor', true, 9),
  ('brand-infinix', 'Infinix', 'انفينكس', 'infinix', true, 10)
ON CONFLICT (id) DO NOTHING;

-- CATEGORIES
INSERT INTO public.categories (id, name, "nameAr", slug, icon, "isActive", "sortOrder") VALUES
  ('cat-smartphones', 'Smartphones', 'هواتف ذكية', 'smartphones', 'Smartphone', true, 1),
  ('cat-accessories', 'Accessories', 'اكسسوارات', 'accessories', 'ShoppingBag', true, 2),
  ('cat-cases', 'Cases & Covers', 'جرابات واغطية', 'cases', 'Shield', true, 3),
  ('cat-chargers', 'Chargers & Cables', 'شواحن وكابلات', 'chargers', 'Battery', true, 4),
  ('cat-headphones', 'Headphones & Earbuds', 'سماعات', 'headphones', 'Headphones', true, 5),
  ('cat-screen-protectors', 'Screen Protectors', 'حماية شاشات', 'screen-protectors', 'Monitor', true, 6)
ON CONFLICT (id) DO NOTHING;

-- PRODUCTS
INSERT INTO public.products (id, name, "nameAr", slug, "categoryId", "brandId", "basePrice", "salePrice", "isOnSale", "totalStock", "isActive", "isFeatured") VALUES
  ('prod-iphone15pro', 'iPhone 15 Pro', 'ايفون 15 برو', 'iphone-15-pro', 'cat-smartphones', 'brand-apple', 52999, 49999, true, 50, true, true),
  ('prod-iphone15', 'iPhone 15', 'ايفون 15', 'iphone-15', 'cat-smartphones', 'brand-apple', 39999, null, false, 80, true, true),
  ('prod-s24ultra', 'Galaxy S24 Ultra', 'جالاكسي S24 الترا', 'galaxy-s24-ultra', 'cat-smartphones', 'brand-samsung', 48999, 45999, true, 60, true, true),
  ('prod-s24', 'Galaxy S24', 'جالاكسي S24', 'galaxy-s24', 'cat-smartphones', 'brand-samsung', 32999, null, false, 100, true, false),
  ('prod-p60pro', 'Huawei P60 Pro', 'هواوي P60 برو', 'huawei-p60-pro', 'cat-smartphones', 'brand-huawei', 29999, 27999, true, 40, true, false),
  ('prod-redmi13', 'Redmi Note 13 Pro', 'ردمي نوت 13 برو', 'redmi-note-13-pro', 'cat-smartphones', 'brand-xiaomi', 12999, 11499, true, 150, true, true),
  ('prod-reno11', 'OPPO Reno 11', 'اوبو رينو 11', 'oppo-reno-11', 'cat-smartphones', 'brand-oppo', 14999, null, false, 70, true, false),
  ('prod-v29', 'Vivo V29', 'فيفو V29', 'vivo-v29', 'cat-smartphones', 'brand-vivo', 16999, 15499, true, 55, true, false),
  ('prod-airpodspro', 'AirPods Pro 2', 'ايربودز برو 2', 'airpods-pro-2', 'cat-headphones', 'brand-apple', 9999, null, false, 200, true, true),
  ('prod-galbuds', 'Galaxy Buds FE', 'جالاكسي بادز FE', 'galaxy-buds-fe', 'cat-headphones', 'brand-samsung', 3999, 3499, true, 150, true, false),
  ('prod-65w-charger', '65W Fast Charger', 'شاحن سريع 65 واط', '65w-fast-charger', 'cat-chargers', null, 999, 799, true, 300, true, false),
  ('prod-magsafe-case', 'MagSafe Clear Case', 'كفر ماج سيف شفاف', 'magsafe-clear-case', 'cat-cases', 'brand-apple', 1499, null, false, 500, true, false)
ON CONFLICT (id) DO NOTHING;

-- PRODUCT VARIANTS
INSERT INTO public.product_variants (id, "productId", color, "colorHex", storage, ram, price, stock) VALUES
  ('var-iphone15pro-256-black', 'prod-iphone15pro', 'Black Titanium', '#1C1C1E', '256GB', '8GB', 49999, 20),
  ('var-iphone15pro-256-blue', 'prod-iphone15pro', 'Blue Titanium', '#394C6A', '256GB', '8GB', 49999, 15),
  ('var-iphone15pro-512-black', 'prod-iphone15pro', 'Black Titanium', '#1C1C1E', '512GB', '8GB', 56999, 10),
  ('var-iphone15-128-black', 'prod-iphone15', 'Black', '#1C1C1E', '128GB', '6GB', 39999, 30),
  ('var-iphone15-128-blue', 'prod-iphone15', 'Blue', '#4A6FA5', '128GB', '6GB', 39999, 25),
  ('var-iphone15-256-green', 'prod-iphone15', 'Green', '#4E7C5E', '256GB', '6GB', 43999, 20),
  ('var-s24ultra-256-titanium', 'prod-s24ultra', 'Titanium Gray', '#8B8B8B', '256GB', '12GB', 45999, 25),
  ('var-s24ultra-512-titanium', 'prod-s24ultra', 'Titanium Black', '#2C2C2C', '512GB', '12GB', 51999, 15),
  ('var-s24-256-black', 'prod-s24', 'Onyx Black', '#1C1C1E', '256GB', '8GB', 32999, 40),
  ('var-s24-256-violet', 'prod-s24', 'Marble Gray', '#B8B8B8', '256GB', '8GB', 32999, 35),
  ('var-redmi13-256-black', 'prod-redmi13', 'Midnight Black', '#1C1C1E', '256GB', '8GB', 11499, 60),
  ('var-redmi13-256-blue', 'prod-redmi13', 'Ocean Blue', '#3B82F6', '256GB', '8GB', 11499, 50),
  ('var-redmi13-512-black', 'prod-redmi13', 'Midnight Black', '#1C1C1E', '512GB', '12GB', 13499, 30)
ON CONFLICT (id) DO NOTHING;

-- SPECIFICATIONS
INSERT INTO public.specifications (id, "productId", "groupName", key, value, "sortOrder") VALUES
  ('spec-iphone15pro-1', 'prod-iphone15pro', 'الشاشة', 'الحجم', '6.1 بوصة Super Retina XDR', 1),
  ('spec-iphone15pro-2', 'prod-iphone15pro', 'الشاشة', 'النوع', 'OLED', 2),
  ('spec-iphone15pro-3', 'prod-iphone15pro', 'المعالج', 'النوع', 'A17 Pro', 1),
  ('spec-iphone15pro-4', 'prod-iphone15pro', 'الكاميرا', 'الرئيسية', '48 ميجابكسل', 1),
  ('spec-iphone15pro-5', 'prod-iphone15pro', 'الكاميرا', 'الأمامية', '12 ميجابكسل', 2),
  ('spec-iphone15pro-6', 'prod-iphone15pro', 'البطارية', 'السعة', '3274 مللي أمبير', 1),
  ('spec-iphone15pro-7', 'prod-iphone15pro', 'البطارية', 'الشحن', 'USB-C سريع', 2),
  ('spec-iphone15pro-8', 'prod-iphone15pro', 'النظام', 'نظام التشغيل', 'iOS 17', 1),
  ('spec-s24ultra-1', 'prod-s24ultra', 'الشاشة', 'الحجم', '6.8 بوصة Dynamic AMOLED 2X', 1),
  ('spec-s24ultra-2', 'prod-s24ultra', 'الشاشة', 'النوع', 'AMOLED', 2),
  ('spec-s24ultra-3', 'prod-s24ultra', 'المعالج', 'النوع', 'Snapdragon 8 Gen 3', 1),
  ('spec-s24ultra-4', 'prod-s24ultra', 'الكاميرا', 'الرئيسية', '200 ميجابكسل', 1),
  ('spec-s24ultra-5', 'prod-s24ultra', 'الكاميرا', 'الأمامية', '12 ميجابكسل', 2),
  ('spec-s24ultra-6', 'prod-s24ultra', 'البطارية', 'السعة', '5000 مللي أمبير', 1),
  ('spec-s24ultra-7', 'prod-s24ultra', 'البطارية', 'الشحن', '45 واط سريع', 2),
  ('spec-s24ultra-8', 'prod-s24ultra', 'النظام', 'نظام التشغيل', 'Android 14', 1),
  ('spec-redmi13-1', 'prod-redmi13', 'الشاشة', 'الحجم', '6.67 بوصة AMOLED', 1),
  ('spec-redmi13-2', 'prod-redmi13', 'الشاشة', 'النوع', 'AMOLED', 2),
  ('spec-redmi13-3', 'prod-redmi13', 'المعالج', 'النوع', 'MediaTek Helio G99 Ultra', 1),
  ('spec-redmi13-4', 'prod-redmi13', 'الكاميرا', 'الرئيسية', '200 ميجابكسل', 1),
  ('spec-redmi13-5', 'prod-redmi13', 'الكاميرا', 'الأمامية', '16 ميجابكسل', 2),
  ('spec-redmi13-6', 'prod-redmi13', 'البطارية', 'السعة', '5000 مللي أمبير', 1),
  ('spec-redmi13-7', 'prod-redmi13', 'البطارية', 'الشحن', '67 واط سريع', 2),
  ('spec-redmi13-8', 'prod-redmi13', 'النظام', 'نظام التشغيل', 'Android 13', 1)
ON CONFLICT (id) DO NOTHING;

-- BRANCHES
INSERT INTO public.branches (id, name, "nameAr", address, "addressAr", phone, "isActive") VALUES
  ('branch-cairo', 'Cairo Branch', 'فرع القاهرة', '123 Ramses St, Downtown Cairo', '123 شارع رمسيس، وسط البلد، القاهرة', '0225789000', true),
  ('branch-alex', 'Alexandria Branch', 'فرع الإسكندرية', '456 El-Horreya Rd, Alexandria', '456 طريق الحرية، الإسكندرية', '034567890', true),
  ('branch-mansoura', 'Mansoura Branch', 'فرع المنصورة', '789 El-Gomhoria St, Mansoura', '789 شارع الجمهورية، المنصورة', '0502345678', true)
ON CONFLICT (id) DO NOTHING;

-- BANNERS
INSERT INTO public.banners (id, title, "titleAr", "imageUrl", "linkType", "isActive", "sortOrder") VALUES
  ('banner-1', 'Summer Sale', 'تخفيضات الصيف', 'https://placehold.co/1200x400/0F172A/FFFFFF?text=Summer+Sale', 'category', true, 1),
  ('banner-2', 'New Arrivals', 'وصل حديثاً', 'https://placehold.co/1200x400/1E293B/FFFFFF?text=New+Arrivals', 'category', true, 2),
  ('banner-3', 'Apple Special', 'عروض ابل', 'https://placehold.co/1200x400/334155/FFFFFF?text=Apple+Special', 'brand', true, 3)
ON CONFLICT (id) DO NOTHING;
