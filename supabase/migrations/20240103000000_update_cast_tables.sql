-- Drop existing casts_profile table if it exists
DROP TABLE IF EXISTS public.casts_profile CASCADE;

-- Create casts_profile table with proper structure
CREATE TABLE public.casts_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID UNIQUE NOT NULL REFERENCES public.staffs(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  birthday DATE,
  blood_type VARCHAR(2) CHECK (blood_type IN ('A', 'B', 'O', 'AB')),
  height INTEGER CHECK (height > 0 AND height < 300),
  three_size VARCHAR(20),
  hobby TEXT,
  special_skill TEXT,
  self_introduction TEXT,
  profile_image_url TEXT,
  hourly_rate INTEGER NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  back_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (back_percentage >= 0 AND back_percentage <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.staffs(id),
  updated_by UUID REFERENCES public.staffs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create cast_performances table
CREATE TABLE public.cast_performances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cast_id UUID NOT NULL REFERENCES public.casts_profile(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  shimei_count INTEGER NOT NULL DEFAULT 0 CHECK (shimei_count >= 0),
  dohan_count INTEGER NOT NULL DEFAULT 0 CHECK (dohan_count >= 0),
  sales_amount INTEGER NOT NULL DEFAULT 0 CHECK (sales_amount >= 0),
  drink_count INTEGER NOT NULL DEFAULT 0 CHECK (drink_count >= 0),
  created_by UUID REFERENCES public.staffs(id),
  updated_by UUID REFERENCES public.staffs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cast_id, date)
);

-- Create indexes
CREATE INDEX idx_casts_profile_staff_id ON public.casts_profile(staff_id);
CREATE INDEX idx_casts_profile_is_active ON public.casts_profile(is_active);
CREATE INDEX idx_cast_performances_cast_id ON public.cast_performances(cast_id);
CREATE INDEX idx_cast_performances_date ON public.cast_performances(date);

-- Enable RLS
ALTER TABLE public.casts_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cast_performances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for casts_profile
-- Admin and Manager can view all casts
CREATE POLICY "Admin and Manager can view all casts" ON public.casts_profile
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Cast can view and update their own profile
CREATE POLICY "Cast can view own profile" ON public.casts_profile
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM public.staffs
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Cast can update own profile" ON public.casts_profile
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM public.staffs
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM public.staffs
      WHERE user_id = auth.uid()
    )
  );

-- Admin can create and update any cast profile
CREATE POLICY "Admin can create casts" ON public.casts_profile
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role = 'admin'
    )
  );

CREATE POLICY "Admin can update any cast" ON public.casts_profile
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role = 'admin'
    )
  );

-- RLS Policies for cast_performances
-- Admin, Manager, and the cast themselves can view performances
CREATE POLICY "Admin, Manager, and Cast can view performances" ON public.cast_performances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND (
        staffs.role IN ('admin', 'manager')
        OR staffs.id IN (
          SELECT staff_id FROM public.casts_profile
          WHERE casts_profile.id = cast_performances.cast_id
        )
      )
    )
  );

-- Only Admin and Manager can create/update performances
CREATE POLICY "Admin and Manager can manage performances" ON public.cast_performances
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
    )
  );

-- Create function to calculate cast ranking
CREATE OR REPLACE FUNCTION get_cast_ranking(
  start_date DATE,
  end_date DATE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  cast_id UUID,
  cast_name VARCHAR,
  total_shimei BIGINT,
  total_dohan BIGINT,
  total_sales BIGINT,
  total_drinks BIGINT,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id as cast_id,
    cp.stage_name as cast_name,
    COALESCE(SUM(perf.shimei_count), 0) as total_shimei,
    COALESCE(SUM(perf.dohan_count), 0) as total_dohan,
    COALESCE(SUM(perf.sales_amount), 0) as total_sales,
    COALESCE(SUM(perf.drink_count), 0) as total_drinks,
    RANK() OVER (ORDER BY COALESCE(SUM(perf.sales_amount), 0) DESC) as rank
  FROM public.casts_profile cp
  LEFT JOIN public.cast_performances perf ON cp.id = perf.cast_id
    AND perf.date >= start_date
    AND perf.date <= end_date
  WHERE cp.is_active = true
  GROUP BY cp.id, cp.stage_name
  ORDER BY total_sales DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_casts_profile_updated_at BEFORE UPDATE ON public.casts_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cast_performances_updated_at BEFORE UPDATE ON public.cast_performances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();