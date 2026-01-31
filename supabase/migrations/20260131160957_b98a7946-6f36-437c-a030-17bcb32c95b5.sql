-- =============================================
-- ECFI Project & Schedule Hub - Phase 1 Schema
-- =============================================

-- =============================================
-- REFERENCE TABLES (Dropdown Lists)
-- =============================================

-- Crews (800, 1200, R&D, ECFI, Nelson, etc.)
CREATE TABLE public.crews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Builders (DRB, QBH, HAV, Marrick, J&A)
CREATE TABLE public.builders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT, -- Short code like "DRB"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Locations/Subdivisions
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Phases (Footings, Walls, Basement, Garage, etc.)
CREATE TABLE public.phases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Statuses
CREATE TABLE public.project_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ready Mix Suppliers (Chaney, CSC, Bay Ready Mix, etc.)
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT, -- Short code
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pump Vendors (AC, A&A, Andrews, Jernigan, General)
CREATE TABLE public.pump_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inspection Types (PG, AA, ENG, Builder Set, NA)
CREATE TABLE public.inspection_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inspectors (ALI, Builder Set, County, NA)
CREATE TABLE public.inspectors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crew Members (for commission payments - Hector, Jose, Medardo)
CREATE TABLE public.crew_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- USER PROFILES (for tracking who made entries)
-- =============================================

CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- CORE BUSINESS TABLES
-- =============================================

-- Projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  builder_id UUID REFERENCES public.builders(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  lot_number TEXT NOT NULL,
  status_id UUID REFERENCES public.project_statuses(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Schedule Entries (main daily schedule data)
CREATE TABLE public.schedule_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  crew_id UUID REFERENCES public.crews(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  
  -- Order Status
  order_status TEXT, -- "Set", order number, or empty
  
  -- Notes
  notes TEXT,
  
  -- Ready Mix
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ready_mix_invoice_number TEXT,
  ready_mix_invoice_amount DECIMAL(10,2) DEFAULT 0,
  ready_mix_yards_billed DECIMAL(10,2) DEFAULT 0,
  
  -- Crew Yards
  crew_yards_poured DECIMAL(10,2) DEFAULT 0,
  
  -- Pump
  pump_vendor_id UUID REFERENCES public.pump_vendors(id) ON DELETE SET NULL,
  pump_invoice_number TEXT,
  pump_invoice_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Inspection
  inspection_type_id UUID REFERENCES public.inspection_types(id) ON DELETE SET NULL,
  inspector_id UUID REFERENCES public.inspectors(id) ON DELETE SET NULL,
  inspection_invoice_number TEXT,
  inspection_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Invoicing
  to_be_invoiced BOOLEAN NOT NULL DEFAULT false,
  invoice_complete BOOLEAN NOT NULL DEFAULT false,
  invoice_number TEXT, -- User requested this field
  
  -- Tracking
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- =============================================
-- TIMESTAMPS TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to all tables
CREATE TRIGGER update_crews_updated_at BEFORE UPDATE ON public.crews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_builders_updated_at BEFORE UPDATE ON public.builders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_phases_updated_at BEFORE UPDATE ON public.phases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_project_statuses_updated_at BEFORE UPDATE ON public.project_statuses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pump_vendors_updated_at BEFORE UPDATE ON public.pump_vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspection_types_updated_at BEFORE UPDATE ON public.inspection_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspectors_updated_at BEFORE UPDATE ON public.inspectors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crew_members_updated_at BEFORE UPDATE ON public.crew_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schedule_entries_updated_at BEFORE UPDATE ON public.schedule_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

-- Reference tables: All authenticated users can read, only authenticated users can modify
-- Crews
CREATE POLICY "Authenticated users can view crews" ON public.crews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crews" ON public.crews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crews" ON public.crews FOR UPDATE TO authenticated USING (true);

-- Builders
CREATE POLICY "Authenticated users can view builders" ON public.builders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert builders" ON public.builders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update builders" ON public.builders FOR UPDATE TO authenticated USING (true);

-- Locations
CREATE POLICY "Authenticated users can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update locations" ON public.locations FOR UPDATE TO authenticated USING (true);

-- Phases
CREATE POLICY "Authenticated users can view phases" ON public.phases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert phases" ON public.phases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update phases" ON public.phases FOR UPDATE TO authenticated USING (true);

-- Project Statuses
CREATE POLICY "Authenticated users can view statuses" ON public.project_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert statuses" ON public.project_statuses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update statuses" ON public.project_statuses FOR UPDATE TO authenticated USING (true);

-- Suppliers
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (true);

-- Pump Vendors
CREATE POLICY "Authenticated users can view pump_vendors" ON public.pump_vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pump_vendors" ON public.pump_vendors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pump_vendors" ON public.pump_vendors FOR UPDATE TO authenticated USING (true);

-- Inspection Types
CREATE POLICY "Authenticated users can view inspection_types" ON public.inspection_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert inspection_types" ON public.inspection_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inspection_types" ON public.inspection_types FOR UPDATE TO authenticated USING (true);

-- Inspectors
CREATE POLICY "Authenticated users can view inspectors" ON public.inspectors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert inspectors" ON public.inspectors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update inspectors" ON public.inspectors FOR UPDATE TO authenticated USING (true);

-- Crew Members
CREATE POLICY "Authenticated users can view crew_members" ON public.crew_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert crew_members" ON public.crew_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update crew_members" ON public.crew_members FOR UPDATE TO authenticated USING (true);

-- Profiles: Users can view all profiles, update only their own
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Projects: All authenticated users can CRUD
CREATE POLICY "Authenticated users can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update projects" ON public.projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete projects" ON public.projects FOR DELETE TO authenticated USING (true);

-- Schedule Entries: All authenticated users can CRUD
CREATE POLICY "Authenticated users can view entries" ON public.schedule_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert entries" ON public.schedule_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update entries" ON public.schedule_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete entries" ON public.schedule_entries FOR DELETE TO authenticated USING (true);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- SEED DATA FROM YOUR SHEETS
-- =============================================

-- Crews
INSERT INTO public.crews (name) VALUES 
  ('800'), ('1200'), ('R&D'), ('ECFI'), ('Nelson'), ('NELSON & 800');

-- Builders
INSERT INTO public.builders (name, code) VALUES 
  ('DRB', 'DRB'), ('QBH', 'QBH'), ('HAV', 'HAV'), ('Marrick', 'MARRICK'), ('J&A', 'J&A');

-- Locations
INSERT INTO public.locations (name) VALUES 
  ('Westridge'), ('Bryans Crossing'), ('Fischer Grant'), ('Rebeccas Field'), 
  ('Fairways'), ('Meadows at Town Run'), ('Parkside Elevate');

-- Phases (in order)
INSERT INTO public.phases (name, display_order) VALUES 
  ('Footings', 1), ('Walls', 2), ('Basement', 3), ('Garage', 4), 
  ('Exteriors', 5), ('Driveways', 6), ('Sidewalks', 7), ('Aprons', 8), 
  ('Leadwalks', 9), ('Patio', 10), ('Areaway', 11), ('Front Porch', 12), 
  ('Rear Porch', 13), ('Stoops', 14), ('Sub Wall', 15), ('Repair', 16);

-- Project Statuses (in order)
INSERT INTO public.project_statuses (name, display_order) VALUES 
  ('Upcoming', 1), ('Ready to Start', 2), ('In Progress', 3), 
  ('Ready to Invoice', 4), ('Invoice Complete - Archive', 5);

-- Suppliers
INSERT INTO public.suppliers (name, code) VALUES 
  ('Chaney', 'CHANEY'), ('CSC', 'CSC'), ('Bay Ready Mix', 'BAY'), 
  ('Schuster', 'SCHUSTER'), ('DC Materials', 'DCM'), ('MFI', 'MFI');

-- Pump Vendors
INSERT INTO public.pump_vendors (name, code) VALUES 
  ('AC', 'AC'), ('A&A', 'A&A'), ('Andrews', 'ANDREWS'), 
  ('Jernigan', 'JERNIGAN'), ('General', 'GENERAL'), ('-', '-');

-- Inspection Types
INSERT INTO public.inspection_types (name) VALUES 
  ('PG'), ('AA'), ('ENG'), ('Builder Set'), ('NA');

-- Inspectors
INSERT INTO public.inspectors (name) VALUES 
  ('ALI'), ('Builder Set'), ('County'), ('NA');

-- Crew Members (based on commission sheet)
INSERT INTO public.crew_members (name, crew_id) 
SELECT 'Hector', id FROM public.crews WHERE name = '800';
INSERT INTO public.crew_members (name, crew_id) 
SELECT 'Jose', id FROM public.crews WHERE name = '1200';
INSERT INTO public.crew_members (name, crew_id) 
SELECT 'Medardo', id FROM public.crews WHERE name = '1200';