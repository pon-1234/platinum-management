-- List public views and whether security_invoker is set
select
  n.nspname as schema,
  c.relname as view_name,
  c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'v'
  and n.nspname = 'public'
  and c.relname in (
    'payroll_revenue_facts',
    'customer_analytics_metrics',
    'customer_segments',
    'staff',
    'visit_cast_summary'
  )
order by view_name;