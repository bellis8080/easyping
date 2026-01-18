-- Story 5.4: Basic Analytics Dashboard
-- Add PostgreSQL functions for ping analytics calculations

-- Function to calculate average resolution time in minutes
CREATE OR REPLACE FUNCTION get_avg_resolution_time(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result NUMERIC;
BEGIN
  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60)
  INTO result
  FROM pings
  WHERE tenant_id = p_tenant_id
    AND resolved_at IS NOT NULL
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND status != 'draft';

  RETURN result;
END;
$$;

-- Function to calculate SLA compliance rate (percentage)
CREATE OR REPLACE FUNCTION get_sla_compliance_rate(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_resolved INTEGER;
  compliant_resolved INTEGER;
  result NUMERIC;
BEGIN
  -- Count total resolved pings in period
  SELECT COUNT(*)
  INTO total_resolved
  FROM pings
  WHERE tenant_id = p_tenant_id
    AND resolved_at IS NOT NULL
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND status != 'draft';

  IF total_resolved = 0 THEN
    RETURN NULL;
  END IF;

  -- Count resolved pings that were NOT breached
  SELECT COUNT(*)
  INTO compliant_resolved
  FROM pings
  WHERE tenant_id = p_tenant_id
    AND resolved_at IS NOT NULL
    AND created_at >= p_start_date
    AND created_at < p_end_date
    AND status != 'draft'
    AND (sla_breached IS NULL OR sla_breached = false);

  result := (compliant_resolved::NUMERIC / total_resolved::NUMERIC) * 100;

  RETURN result;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_avg_resolution_time(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sla_compliance_rate(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION get_avg_resolution_time IS 'Calculate average resolution time in minutes for pings in a date range';
COMMENT ON FUNCTION get_sla_compliance_rate IS 'Calculate SLA compliance rate (percentage) for pings in a date range';
