-- Check deposit_requests and their user relationships
SELECT 
    dr.id,
    dr.user_id,
    dr.amount,
    dr.status,
    u.user_id as business_user_id,
    u.name as user_name,
    u.email as user_email
FROM deposit_requests dr
LEFT JOIN users u ON dr.user_id = u.id;

-- If you see NULL values for user_name and user_email, delete those broken records:
-- DELETE FROM deposit_requests WHERE user_id NOT IN (SELECT id FROM users);

-- Or delete all deposit requests to start fresh:
-- DELETE FROM deposit_requests;
