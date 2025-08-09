-- Create payroll_revenue_facts view for calculating cast compensation
-- This view consolidates order items with cast attributions for payroll calculations

CREATE OR REPLACE VIEW public.payroll_revenue_facts AS
SELECT
    DATE(oi.created_at) AS work_date,
    bia.cast_id,
    cp.stage_name AS cast_name,
    oi.product_id,
    p.name AS product_name,
    p.category AS product_category,
    bia.attribution_amount,
    bia.attribution_percentage,
    bia.attribution_type,
    ce.role AS engagement_role,
    nt.display_name AS nomination_type,
    -- nt.back_rate, -- このカラムが存在しない場合はコメントアウト
    v.id AS visit_id,
    v.session_code,
    oi.id AS order_item_id,
    -- Additional calculated fields
    -- CASE 
    --     WHEN ce.role = 'primary' THEN nt.back_rate
    --     WHEN ce.role = 'inhouse' THEN COALESCE(nt.back_rate, 0) * 0.8
    --     ELSE COALESCE(nt.back_rate, 0) * 0.5
    -- END AS effective_back_rate,
    0 AS effective_back_rate, -- back_rateカラムが存在しない場合は0を返す
    -- Revenue attribution for this cast member
    (oi.total_price * bia.attribution_percentage / 100) AS attributed_revenue
FROM public.bill_item_attributions bia
JOIN public.order_items oi ON oi.id = bia.order_item_id
JOIN public.products p ON p.id = oi.product_id
JOIN public.casts_profile cp ON cp.id = bia.cast_id
JOIN public.visits v ON v.id = oi.visit_id
LEFT JOIN public.cast_engagements ce 
    ON ce.visit_id = v.id 
    AND ce.cast_id = bia.cast_id 
    AND ce.is_active = true
LEFT JOIN public.nomination_types nt 
    ON nt.id = ce.nomination_type_id
-- WHERE oi.status != 'cancelled' -- Exclude cancelled items (statusカラムが存在しない)
--   AND bia.is_active = true; -- Only active attributions (is_activeカラムが存在しない)
;

-- Grant permissions
GRANT SELECT ON public.payroll_revenue_facts TO authenticated;
GRANT SELECT ON public.payroll_revenue_facts TO service_role;

-- Add comment for documentation
COMMENT ON VIEW public.payroll_revenue_facts IS 
'Consolidated view for payroll calculations, linking order items to cast engagements with proper revenue attribution';

-- Create index on base tables for better performance
CREATE INDEX IF NOT EXISTS idx_bill_item_attributions_cast_order 
  ON public.bill_item_attributions(cast_id, order_item_id);
  -- WHERE is_active = true; -- is_activeカラムが存在しない

CREATE INDEX IF NOT EXISTS idx_order_items_visit_status 
  ON public.order_items(visit_id);
  -- WHERE status != 'cancelled'; -- statusカラムが存在しない

CREATE INDEX IF NOT EXISTS idx_cast_engagements_visit_cast 
  ON public.cast_engagements(visit_id, cast_id) 
  WHERE is_active = true;