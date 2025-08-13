-- Set views to use invoker security
alter view public.payroll_revenue_facts set (security_invoker = true);
alter view public.customer_analytics_metrics set (security_invoker = true);
alter view public.customer_segments set (security_invoker = true);
alter view public.staff set (security_invoker = true);
alter view public.visit_cast_summary set (security_invoker = true);

-- Enable RLS on customer_cohorts table
alter table public.customer_cohorts enable row level security;

-- Allow staff to read customer_cohorts
create policy "Allow read to staff on customer_cohorts"
on public.customer_cohorts
for select
to authenticated
using (
  exists (
    select 1 from public.staffs s
    where s.user_id = auth.uid()
  )
);