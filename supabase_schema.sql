-- Supabase Database Schema for Nexora Salon App
-- Copy and paste this script into your Supabase SQL Editor (https://app.supabase.com -> SQL Editor -> New Query)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Shops Table
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all required columns exist in public.shops if table was created previously
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Shop Open';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Salon & Spa';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS city VARCHAR(100) DEFAULT 'Mumbai';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS pin_code VARCHAR(20) DEFAULT '400050';
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE;

-- 3. Profiles Table (Shop Owners / Staff Users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'Shop Owner',
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'Hair',
    duration INT DEFAULT 30,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    rating DECIMAL(3, 2) DEFAULT 5.0,
    status VARCHAR(50) DEFAULT 'Available',
    avatar_url TEXT,
    mobile VARCHAR(50),
    email VARCHAR(255),
    specialization TEXT,
    commission VARCHAR(20) DEFAULT '15%',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    visits INT DEFAULT 1,
    spent VARCHAR(50) DEFAULT '₹0',
    "lastVisit" VARCHAR(100) DEFAULT 'Today',
    status VARCHAR(50) DEFAULT 'VIP Customer',
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    service_name VARCHAR(255) NOT NULL,
    staff_name VARCHAR(255),
    date VARCHAR(50) NOT NULL,
    time VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Confirmed',
    price DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public Access Policies for Demo / Owner Portal
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to prevent errors when re-running
DROP POLICY IF EXISTS "Allow public access to shops" ON public.shops;
DROP POLICY IF EXISTS "Allow public access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public access to services" ON public.services;
DROP POLICY IF EXISTS "Allow public access to staff" ON public.staff;
DROP POLICY IF EXISTS "Allow public access to customers" ON public.customers;
DROP POLICY IF EXISTS "Allow public access to appointments" ON public.appointments;

-- Create policies for public full-stack access
CREATE POLICY "Allow public access to shops" ON public.shops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to services" ON public.services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to staff" ON public.staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

-- Insert Default Demo Shop Data safely
INSERT INTO public.shops (id, name, status, category, phone, email, address, city, pin_code)
VALUES ('22222222-2222-2222-2222-222222222222', 'Nexora Hair & Beauty Salon', 'Shop Open', 'Salon & Spa', '+91 9876543210', 'owner@royalglow.com', '123 High Street, Bandra West', 'Mumbai', '400050')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address;

-- Storage Bucket Setup (for image uploads)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('salon-assets', 'salon-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Read & Upload Access for salon-assets" ON storage.objects;
CREATE POLICY "Public Read & Upload Access for salon-assets" ON storage.objects
FOR ALL USING (bucket_id = 'salon-assets') WITH CHECK (bucket_id = 'salon-assets');
