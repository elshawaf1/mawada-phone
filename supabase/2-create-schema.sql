-- Mawada Phone - 2. CREATE SCHEMA (Run Second)
-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  avatar text,
  role text DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE public.categories (
  id text PRIMARY KEY DEFAULT ('cat_' || encode(gen_random_bytes(8), 'hex')),
  name text NOT NULL,
  "nameAr" text NOT NULL,
  slug text UNIQUE NOT NULL,
  "parentId" text REFERENCES public.categories(id),
  icon text,
  "imageUrl" text,
  "isActive" boolean DEFAULT true,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. BRANDS TABLE
-- ============================================
CREATE TABLE public.brands (
  id text PRIMARY KEY DEFAULT ('brand_' || encode(gen_random_bytes(8), 'hex')),
  name text NOT NULL,
  "nameAr" text NOT NULL,
  slug text UNIQUE NOT NULL,
  "logoUrl" text,
  "isActive" boolean DEFAULT true,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. BANNERS TABLE
-- ============================================
CREATE TABLE public.banners (
  id text PRIMARY KEY DEFAULT ('banner_' || encode(gen_random_bytes(8), 'hex')),
  title text,
  "titleAr" text,
  "imageUrl" text NOT NULL,
  "linkType" text CHECK ("linkType" IN ('product', 'category', 'brand', 'external')),
  "linkId" text,
  "linkUrl" text,
  "isActive" boolean DEFAULT true,
  "sortOrder" integer DEFAULT 0,
  "startsAt" timestamp,
  "endsAt" timestamp,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. BRANCHES TABLE
-- ============================================
CREATE TABLE public.branches (
  id text PRIMARY KEY DEFAULT ('branch_' || encode(gen_random_bytes(8), 'hex')),
  name text NOT NULL,
  "nameAr" text,
  address text NOT NULL,
  "addressAr" text,
  phone text,
  latitude numeric,
  longitude numeric,
  "workingHours" text,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. PRODUCTS TABLE
-- ============================================
CREATE TABLE public.products (
  id text PRIMARY KEY DEFAULT ('prod_' || encode(gen_random_bytes(8), 'hex')),
  name text NOT NULL,
  "nameAr" text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  "descriptionAr" text,
  "categoryId" text REFERENCES public.categories(id),
  "brandId" text REFERENCES public.brands(id),
  "basePrice" numeric NOT NULL DEFAULT 0,
  "salePrice" numeric,
  "isOnSale" boolean DEFAULT false,
  "totalStock" integer DEFAULT 0,
  sku text,
  "isActive" boolean DEFAULT true,
  "isFeatured" boolean DEFAULT false,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. PRODUCT IMAGES TABLE
-- ============================================
CREATE TABLE public.product_images (
  id text PRIMARY KEY DEFAULT ('img_' || encode(gen_random_bytes(8), 'hex')),
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  url text NOT NULL,
  "isPrimary" boolean DEFAULT false,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. PRODUCT VARIANTS TABLE
-- ============================================
CREATE TABLE public.product_variants (
  id text PRIMARY KEY DEFAULT ('var_' || encode(gen_random_bytes(8), 'hex')),
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color text,
  "colorHex" text,
  storage text,
  ram text,
  price numeric NOT NULL DEFAULT 0,
  stock integer DEFAULT 0,
  sku text,
  "isActive" boolean DEFAULT true,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. SPECIFICATIONS TABLE
-- ============================================
CREATE TABLE public.specifications (
  id text PRIMARY KEY DEFAULT ('spec_' || encode(gen_random_bytes(8), 'hex')),
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "groupName" text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  "sortOrder" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. CART ITEMS TABLE
-- ============================================
CREATE TABLE public.cart_items (
  id text PRIMARY KEY DEFAULT ('cart_' || encode(gen_random_bytes(8), 'hex')),
  "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "variantId" text REFERENCES public.product_variants(id),
  quantity integer NOT NULL DEFAULT 1,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "productId", "variantId")
);

-- ============================================
-- 11. WISHLIST ITEMS TABLE
-- ============================================
CREATE TABLE public.wishlist_items (
  id text PRIMARY KEY DEFAULT ('wish_' || encode(gen_random_bytes(8), 'hex')),
  "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "productId")
);

-- ============================================
-- 12. ORDERS TABLE
-- ============================================
CREATE TABLE public.orders (
  id text PRIMARY KEY DEFAULT ('ord_' || encode(gen_random_bytes(8), 'hex')),
  "orderNumber" text UNIQUE NOT NULL,
  "userId" uuid NOT NULL REFERENCES public.profiles(id),
  status text DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  "paymentMethod" text CHECK ("paymentMethod" IN ('COD', 'FAWRY', 'VISA', 'BRANCH', 'INSTAPAY', 'WALLET')),
  "paymentStatus" text DEFAULT 'UNPAID' CHECK ("paymentStatus" IN ('UNPAID', 'PAID', 'REFUNDED', 'FAILED')),
  subtotal numeric NOT NULL DEFAULT 0,
  "shippingCost" numeric DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  "addressId" text,
  "branchId" text,
  "fawryCode" text,
  "couponCode" text,
  "paymobOrderId" text,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 13. ORDER ITEMS TABLE
-- ============================================
CREATE TABLE public.order_items (
  id text PRIMARY KEY DEFAULT ('oi_' || encode(gen_random_bytes(8), 'hex')),
  "orderId" text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "productId" text REFERENCES public.products(id),
  "variantId" text REFERENCES public.product_variants(id),
  quantity integer NOT NULL,
  "unitPrice" numeric NOT NULL,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. ADDRESSES TABLE
-- ============================================
CREATE TABLE public.addresses (
  id text PRIMARY KEY DEFAULT ('addr_' || encode(gen_random_bytes(8), 'hex')),
  "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text,
  city text NOT NULL,
  region text,
  street text NOT NULL,
  phone text,
  "isDefault" boolean DEFAULT false,
  latitude numeric,
  longitude numeric,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 15. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
  id text PRIMARY KEY DEFAULT ('notif_' || encode(gen_random_bytes(8), 'hex')),
  "userId" uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  "titleAr" text,
  body text NOT NULL,
  "bodyAr" text,
  type text DEFAULT 'info' CHECK (type IN ('info', 'order', 'promo', 'system')),
  "isRead" boolean DEFAULT false,
  "sentBy" uuid REFERENCES public.profiles(id),
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 16. REVIEWS TABLE
-- ============================================
CREATE TABLE public.reviews (
  id text PRIMARY KEY DEFAULT ('rev_' || encode(gen_random_bytes(8), 'hex')),
  "userId" uuid NOT NULL REFERENCES public.profiles(id),
  "productId" text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "orderId" text REFERENCES public.orders(id),
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  "isVisible" boolean DEFAULT false,
  "createdAt" timestamp DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 17. INDEXES
-- ============================================
CREATE INDEX idx_products_category ON public.products("categoryId");
CREATE INDEX idx_products_active ON public.products("isActive");
CREATE INDEX idx_products_featured ON public.products("isFeatured");
CREATE INDEX idx_product_images_product ON public.product_images("productId");
CREATE INDEX idx_product_variants_product ON public.product_variants("productId");
CREATE INDEX idx_specifications_product ON public.specifications("productId");
CREATE INDEX idx_cart_user ON public.cart_items("userId");
CREATE INDEX idx_wishlist_user ON public.wishlist_items("userId");
CREATE INDEX idx_orders_user ON public.orders("userId");
CREATE INDEX idx_orders_status ON public.orders("status");
CREATE INDEX idx_order_items_order ON public.order_items("orderId");
CREATE INDEX idx_addresses_user ON public.addresses("userId");
CREATE INDEX idx_notifications_user ON public.notifications("userId");
CREATE INDEX idx_notifications_read ON public.notifications("userId", "isRead");
CREATE INDEX idx_reviews_product ON public.reviews("productId");

-- ============================================
-- 18. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banner-images', 'banner-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 19. RLS POLICIES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specifications ENABLE ROW LEVEL SECURITY;

-- Profiles
-- Any authenticated user can read profiles (safe: no passwords stored here, only name/email/phone/role)
CREATE POLICY "Authenticated users view profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Products
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING ("isActive" = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING ("isActive" = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Brands
CREATE POLICY "Anyone can view brands" ON public.brands FOR SELECT USING ("isActive" = true);
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Banners
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT USING ("isActive" = true);
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Branches
CREATE POLICY "Anyone can view branches" ON public.branches FOR SELECT USING ("isActive" = true);
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Cart
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING ("userId" = auth.uid());

-- Wishlist
CREATE POLICY "Users manage own wishlist" ON public.wishlist_items FOR ALL USING ("userId" = auth.uid());

-- Orders
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "Users can update own orders" ON public.orders FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Order Items
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items."orderId" AND orders."userId" = auth.uid()));
CREATE POLICY "Admins manage all order items" ON public.order_items FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Addresses
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING ("userId" = auth.uid());

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "Admins can create notifications" ON public.notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admins can update notifications" ON public.notifications FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Product Images
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins manage product images" ON public.product_images FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Product Variants
CREATE POLICY "Anyone can view product variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins manage product variants" ON public.product_variants FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Specifications
CREATE POLICY "Anyone can view specifications" ON public.specifications FOR SELECT USING (true);
CREATE POLICY "Admins manage specifications" ON public.specifications FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING ("isVisible" = true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "Admins manage all reviews" ON public.reviews FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Storage Policies
CREATE POLICY "Product images public read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin delete product images" ON storage.objects FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Banner images public read" ON storage.objects FOR SELECT USING (bucket_id = 'banner-images');
CREATE POLICY "Admin upload banner images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banner-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin delete banner images" ON storage.objects FOR DELETE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'user-avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================
-- 20. TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', ''), 'CUSTOMER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 21. REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- ============================================
-- 22. FUNCTIONS
-- ============================================

-- Get top products by sold count
CREATE OR REPLACE FUNCTION public.get_top_products(limit_count integer DEFAULT 5)
RETURNS TABLE (id text, "nameAr" text, name text, "soldCount" bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p."nameAr", p.name, COALESCE(SUM(oi.quantity), 0) as "soldCount"
  FROM public.products p
  LEFT JOIN public.order_items oi ON oi."productId" = p.id
  LEFT JOIN public.orders o ON o.id = oi."orderId" AND o.status != 'CANCELLED'
  WHERE p."isActive" = true
  GROUP BY p.id, p."nameAr", p.name
  ORDER BY "soldCount" DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
