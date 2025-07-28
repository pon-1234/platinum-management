-- =============================================================================
-- テーブルに is_active カラムを追加
-- is_available: テーブルが現在利用可能かどうか（空席か）
-- is_active: テーブルが運用中かどうか（撤去されていないか）
-- =============================================================================

-- Add is_active column to tables table
ALTER TABLE public.tables
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Create an index for better performance
CREATE INDEX idx_tables_is_active ON public.tables(is_active);

-- Add comments for clarity
COMMENT ON COLUMN public.tables.is_active IS 'テーブルが運用中かどうか（撤去されていないか）';
COMMENT ON COLUMN public.tables.is_available IS 'テーブルが現在利用可能かどうか（空席か）';