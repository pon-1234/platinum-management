-- Demo Authentication Data
-- These are test users for the demo environment

-- Note: In production Supabase, users are typically created through the auth API
-- This is for demo purposes only

-- Demo users that can be created via Supabase Dashboard or auth API:

/*
Demo Users to create in Supabase Dashboard:

1. Admin User:
   Email: admin@platinum-demo.com
   Password: DemoAdmin123!
   Role: admin
   
2. Manager User:
   Email: manager@platinum-demo.com  
   Password: DemoManager123!
   Role: manager
   
3. Hall Staff User:
   Email: hall@platinum-demo.com
   Password: DemoHall123!
   Role: hall
   
4. Cashier User:
   Email: cashier@platinum-demo.com
   Password: DemoCashier123!
   Role: cashier
   
5. Cast User:
   Email: cast@platinum-demo.com
   Password: DemoCast123!
   Role: cast

After creating these users in Supabase Dashboard, update the staff records with their user_ids:

UPDATE staffs SET user_id = '[admin-user-id]' WHERE full_name = '田中 太郎';
UPDATE staffs SET user_id = '[manager-user-id]' WHERE full_name = '佐藤 花子';
UPDATE staffs SET user_id = '[hall-user-id]' WHERE full_name = '鈴木 一郎';
UPDATE staffs SET user_id = '[cashier-user-id]' WHERE full_name = '高橋 美咲';
UPDATE staffs SET user_id = '[cast-user-id]' WHERE full_name = '山田 愛';
*/

-- Demo data status summary
SELECT 
  'Customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'Staff', COUNT(*) FROM staffs
UNION ALL  
SELECT 'Tables', COUNT(*) FROM tables
UNION ALL
SELECT 'Products', COUNT(*) FROM inventory_products
UNION ALL
SELECT 'Visits', COUNT(*) FROM visits
UNION ALL
SELECT 'Reservations', COUNT(*) FROM reservations
UNION ALL
SELECT 'Attendance', COUNT(*) FROM attendance_records
UNION ALL
SELECT 'Bottle Keep', COUNT(*) FROM bottle_keep_records
UNION ALL
SELECT 'Cast Performance', COUNT(*) FROM cast_performance;