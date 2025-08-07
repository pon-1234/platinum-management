-- 給与計算を保存するトランザクション関数
CREATE OR REPLACE FUNCTION save_payroll_calculation(
    p_hostess_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_rule_id UUID,
    p_base_salary INTEGER,
    p_back_amount INTEGER,
    p_bonus_amount INTEGER,
    p_deductions INTEGER,
    p_gross_amount INTEGER,
    p_net_amount INTEGER,
    p_status VARCHAR(20),
    p_details JSONB
) RETURNS UUID AS $$
DECLARE
    v_calculation_id UUID;
    v_detail JSONB;
BEGIN
    -- payroll_calculationsにメインデータを挿入
    INSERT INTO payroll_calculations (
        hostess_id,
        calculation_period_start,
        calculation_period_end,
        payroll_rule_id,
        base_salary,
        total_back_amount,
        total_bonus_amount,
        total_deductions,
        gross_amount,
        net_amount,
        calculation_status
    ) VALUES (
        p_hostess_id,
        p_period_start,
        p_period_end,
        p_rule_id,
        p_base_salary,
        p_back_amount,
        p_bonus_amount,
        p_deductions,
        p_gross_amount,
        p_net_amount,
        p_status
    ) RETURNING id INTO v_calculation_id;

    -- payroll_detailsに詳細データを挿入
    IF p_details IS NOT NULL THEN
        FOR v_detail IN SELECT * FROM jsonb_array_elements(p_details)
        LOOP
            INSERT INTO payroll_details (
                payroll_calculation_id,
                detail_type,
                item_name,
                base_amount,
                rate_percentage,
                calculated_amount,
                quantity,
                unit_price,
                description
            ) VALUES (
                v_calculation_id,
                v_detail->>'detail_type',
                v_detail->>'item_name',
                (v_detail->>'base_amount')::INTEGER,
                (v_detail->>'rate_percentage')::DECIMAL(5,2),
                (v_detail->>'calculated_amount')::INTEGER,
                (v_detail->>'quantity')::INTEGER,
                (v_detail->>'unit_price')::INTEGER,
                v_detail->>'description'
            );
        END LOOP;
    END IF;

    RETURN v_calculation_id;
EXCEPTION
    WHEN OTHERS THEN
        -- エラーが発生した場合はトランザクションをロールバック
        RAISE;
END;
$$ LANGUAGE plpgsql;

-- 関数への権限付与
GRANT EXECUTE ON FUNCTION save_payroll_calculation TO authenticated;