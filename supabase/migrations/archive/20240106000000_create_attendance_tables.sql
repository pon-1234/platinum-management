-- Create shift_templates table for recurring shifts
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL CHECK (array_length(days_of_week, 1) > 0),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create shift_requests table for cast shift hopes/requests
CREATE TABLE IF NOT EXISTS shift_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cast_id UUID NOT NULL REFERENCES staffs(id),
  request_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES staffs(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(cast_id, request_date)
);

-- Create confirmed_shifts table for finalized shift schedule
CREATE TABLE IF NOT EXISTS confirmed_shifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  shift_type TEXT DEFAULT 'regular' CHECK (shift_type IN ('regular', 'overtime', 'holiday')),
  notes TEXT,
  created_by UUID REFERENCES staffs(id),
  updated_by UUID REFERENCES staffs(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, shift_date)
);

-- Create attendance_records table for actual clock-in/out
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staffs(id),
  attendance_date DATE NOT NULL,
  clock_in_time TIMESTAMPTZ,
  clock_out_time TIMESTAMPTZ,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  break_start_time TIMESTAMPTZ,
  break_end_time TIMESTAMPTZ,
  total_work_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - 
          COALESCE(break_end_time - break_start_time, INTERVAL '0'))) / 60
      ELSE NULL
    END
  ) STORED,
  overtime_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL AND scheduled_start_time IS NOT NULL AND scheduled_end_time IS NOT NULL THEN
        GREATEST(0, 
          EXTRACT(EPOCH FROM (clock_out_time - clock_in_time - 
            COALESCE(break_end_time - break_start_time, INTERVAL '0'))) / 60 -
          EXTRACT(EPOCH FROM (scheduled_end_time - scheduled_start_time)) / 60
        )
      ELSE 0
    END
  ) STORED,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'early_leave')),
  notes TEXT,
  approved_by UUID REFERENCES staffs(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(staff_id, attendance_date)
);

-- Create attendance_corrections table for manual adjustments
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_record_id UUID NOT NULL REFERENCES attendance_records(id),
  correction_type TEXT NOT NULL CHECK (correction_type IN ('clock_in', 'clock_out', 'break_start', 'break_end', 'manual_hours')),
  original_value TIMESTAMPTZ,
  corrected_value TIMESTAMPTZ,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES staffs(id),
  approved_by UUID REFERENCES staffs(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_shift_requests_cast_id ON shift_requests(cast_id);
CREATE INDEX idx_shift_requests_request_date ON shift_requests(request_date);
CREATE INDEX idx_shift_requests_status ON shift_requests(status);

CREATE INDEX idx_confirmed_shifts_staff_id ON confirmed_shifts(staff_id);
CREATE INDEX idx_confirmed_shifts_shift_date ON confirmed_shifts(shift_date);

CREATE INDEX idx_attendance_records_staff_id ON attendance_records(staff_id);
CREATE INDEX idx_attendance_records_attendance_date ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

CREATE INDEX idx_attendance_corrections_attendance_record_id ON attendance_corrections(attendance_record_id);
CREATE INDEX idx_attendance_corrections_status ON attendance_corrections(status);

-- Enable RLS
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_corrections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shift_templates
-- Only managers and admins can manage shift templates
CREATE POLICY "Managers can manage shift templates" ON shift_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for shift_requests
-- Casts can view and create their own shift requests
CREATE POLICY "Casts can manage own shift requests" ON shift_requests
  FOR ALL USING (
    cast_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can view and approve all shift requests
CREATE POLICY "Managers can manage all shift requests" ON shift_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for confirmed_shifts
-- Staff can view their own confirmed shifts
CREATE POLICY "Staff can view own confirmed shifts" ON confirmed_shifts
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can manage all confirmed shifts
CREATE POLICY "Managers can manage all confirmed shifts" ON confirmed_shifts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for attendance_records
-- Staff can view their own attendance records
CREATE POLICY "Staff can view own attendance records" ON attendance_records
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Staff can update their own clock-in/out (limited fields)
CREATE POLICY "Staff can clock in/out" ON attendance_records
  FOR UPDATE USING (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Staff can create their own attendance records
CREATE POLICY "Staff can create own attendance records" ON attendance_records
  FOR INSERT WITH CHECK (
    staff_id IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can manage all attendance records
CREATE POLICY "Managers can manage all attendance records" ON attendance_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- RLS Policies for attendance_corrections
-- Staff can request corrections for their own records
CREATE POLICY "Staff can request own corrections" ON attendance_corrections
  FOR INSERT WITH CHECK (
    requested_by IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Staff can view corrections for their own records
CREATE POLICY "Staff can view own corrections" ON attendance_corrections
  FOR SELECT USING (
    requested_by IN (
      SELECT id FROM staffs WHERE user_id = auth.uid()
    )
  );

-- Managers can manage all corrections
CREATE POLICY "Managers can manage all corrections" ON attendance_corrections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM staffs
      WHERE staffs.user_id = auth.uid()
      AND staffs.role IN ('admin', 'manager')
      AND staffs.is_active = true
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_shift_templates_updated_at BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_requests_updated_at BEFORE UPDATE ON shift_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_confirmed_shifts_updated_at BEFORE UPDATE ON confirmed_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to get monthly attendance summary
CREATE OR REPLACE FUNCTION get_monthly_attendance_summary(
  staff_id_param UUID,
  year_param INTEGER,
  month_param INTEGER
)
RETURNS TABLE (
  total_work_days INTEGER,
  total_work_hours DECIMAL,
  total_overtime_hours DECIMAL,
  present_days INTEGER,
  absent_days INTEGER,
  late_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_work_days,
    ROUND(COALESCE(SUM(total_work_minutes), 0) / 60.0, 2) as total_work_hours,
    ROUND(COALESCE(SUM(overtime_minutes), 0) / 60.0, 2) as total_overtime_hours,
    COUNT(CASE WHEN status = 'present' THEN 1 END)::INTEGER as present_days,
    COUNT(CASE WHEN status = 'absent' THEN 1 END)::INTEGER as absent_days,
    COUNT(CASE WHEN status = 'late' THEN 1 END)::INTEGER as late_days
  FROM attendance_records
  WHERE staff_id = staff_id_param
    AND EXTRACT(YEAR FROM attendance_date) = year_param
    AND EXTRACT(MONTH FROM attendance_date) = month_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to check for shift conflicts
CREATE OR REPLACE FUNCTION check_shift_conflict(
  staff_id_param UUID,
  shift_date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  exclude_shift_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM confirmed_shifts
  WHERE staff_id = staff_id_param
    AND shift_date = shift_date_param
    AND (
      (start_time <= start_time_param AND end_time > start_time_param) OR
      (start_time < end_time_param AND end_time >= end_time_param) OR
      (start_time >= start_time_param AND end_time <= end_time_param)
    )
    AND (exclude_shift_id IS NULL OR id != exclude_shift_id);
    
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;