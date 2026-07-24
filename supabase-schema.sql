-- ====================================================================
-- NEXORA SALONOS - FINAL SUPABASE DATABASE SCRIPT (TABLES + STORAGE)
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. DANGER ZONE: INTELLIGENT CLEANUP (PREVENTS ERRORS)
-- ====================================================================
DO $$ 
DECLARE
    rel_record RECORD;
BEGIN
    FOR rel_record IN 
        SELECT relname, relkind 
        FROM pg_class 
        JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
        WHERE nspname = 'public' 
        AND relname IN ('gallery', 'transactions', 'reviews', 'bookings', 'services', 'staff', 'customers', 'shops', 'profiles')
    LOOP
        IF rel_record.relkind = 'v' THEN
            EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(rel_record.relname) || ' CASCADE;';
        ELSIF rel_record.relkind = 'r' THEN
            EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(rel_record.relname) || ' CASCADE;';
        END IF;
    END LOOP;
END $$;

-- ====================================================================
-- 3. CREATE TABLES
-- ====================================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'shop_owner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    pin_code VARCHAR(20),
    status VARCHAR(50) DEFAULT 'offline',
    wallet_balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'Regular',
    total_visits INTEGER DEFAULT 0,
    total_spent NUMERIC(10, 2) DEFAULT 0.00,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    rating NUMERIC(3, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    duration INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    booking_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    amount NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    reply TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE public.gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_cover BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- ====================================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS) & POLICIES
-- ====================================================================
-- Allowing public access so frontend connects smoothly during development.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for shops" ON public.shops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for reviews" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for gallery" ON public.gallery FOR ALL USING (true) WITH CHECK (true);


-- ====================================================================
-- 5. SETUP STORAGE BUCKETS (FOR IMAGES/LOGOS)
-- ====================================================================
-- Creates a public bucket named 'salon-assets' if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('salon-assets', 'salon-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies if they exist (to prevent errors)
DROP POLICY IF EXISTS "Public Access to salon-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert to salon-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Update to salon-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete to salon-assets" ON storage.objects;

-- Create Storage Policies (Allows anyone to upload/view images)
CREATE POLICY "Public Access to salon-assets" ON storage.objects FOR SELECT USING (bucket_id = 'salon-assets');
CREATE POLICY "Public Insert to salon-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'salon-assets');
CREATE POLICY "Public Update to salon-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'salon-assets');
CREATE POLICY "Public Delete to salon-assets" ON storage.objects FOR DELETE USING (bucket_id = 'salon-assets');


-- ====================================================================
-- 6. INSERT DUMMY DATA FOR TESTING
-- ====================================================================
INSERT INTO public.profiles (id, email, full_name, role) 
VALUES ('11111111-1111-1111-1111-111111111111', 'owner@royalglow.com', 'Rajesh', 'shop_owner');

INSERT INTO public.shops (id, owner_id, name, description, city, status, wallet_balance)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Royal Glow Salon', 'Premium beauty salon', 'Mumbai', 'active', 18750.00);

INSERT INTO public.services (shop_id, name, category, duration, price, is_active)
VALUES ('22222222-2222-2222-2222-222222222222', 'Bridal Makeup', 'Makeup', 120, 4500.00, true);

INSERT INTO public.customers (id, shop_id, name, phone, status, total_visits)
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Anita Sharma', '+91 9876543210', 'VIP', 12);
