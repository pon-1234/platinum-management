-- ボトルキープ機能の拡充と週間スケジュールの実装

-- ボトルキープ拡張カラム（存在しない場合のみ追加）
ALTER TABLE bottle_keeps
  ADD COLUMN IF NOT EXISTS storage_location TEXT,
  ADD COLUMN IF NOT EXISTS last_served_date DATE,
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC;

-- 期限とステータスでの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_bottle_keeps_status_expiry
  ON bottle_keeps (status, expiry_date);

-- 週間スケジュール RPC を実装
CREATE OR REPLACE FUNCTION get_weekly_schedule(week_start DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_date DATE := date_trunc('day', COALESCE(week_start, CURRENT_DATE));
  day_rows JSONB;
BEGIN
  day_rows := (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', d::date,
        'shifts', COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'staffId', cs.staff_id,
                'startTime', cs.start_time,
                'endTime', cs.end_time,
                'shiftType', cs.shift_type,
                'notes', cs.notes
              )
              ORDER BY cs.start_time
            )
            FROM confirmed_shifts cs
            WHERE cs.shift_date = d::date
          ),
          '[]'::jsonb
        )
      )
      ORDER BY d
    )
    FROM generate_series(start_date, start_date + INTERVAL '6 days', '1 day') AS d
  );

  RETURN jsonb_build_object(
    'weekStart', start_date,
    'dailySchedules', COALESCE(day_rows, '[]'::jsonb)
  );
END;
$$;

COMMENT ON FUNCTION get_weekly_schedule(DATE) IS
  '週の開始日を受け取り、確定シフトを日別にまとめた週間スケジュールを返します。';
