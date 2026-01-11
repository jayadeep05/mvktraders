# Client Data Debugging Guide

## Problem
- Can see deposit requests ✅
- Cannot see client data ❌

## Diagnostic Steps

### Step 1: Check Backend Logs
Look at the backend terminal for any errors when loading the AdminClients screen.
Check for:
- SQL errors
- Null pointer exceptions
- Empty result warnings

### Step 2: Test API Endpoint Directly

Open your browser or use a tool like Postman to test:

```
GET http://localhost:8080/api/admin/clients
Authorization: Bearer YOUR_TOKEN
```

Expected response: Array of client objects
Actual response: Check if it's an empty array `[]`

### Step 3: Check Database

Run these SQL queries in your database:

```sql
-- Check total users
SELECT COUNT(*) FROM users;

-- Check users by role
SELECT role, status, COUNT(*) 
FROM users 
GROUP BY role, status;

-- Check clients specifically
SELECT id, name, email, role, status, created_at
FROM users
WHERE role = 'CLIENT';

-- Check portfolios
SELECT COUNT(*) FROM portfolio;

-- Check if portfolios are linked to users
SELECT p.id, u.name, u.email, u.role, u.status, p.total_invested
FROM portfolio p
LEFT JOIN users u ON p.user_id = u.id;
```

### Step 4: Check Mobile App API Call

Add console logging to the mobile app to see what's being returned:

In `AdminClients.js`, modify the `loadClients` function:

```javascript
const loadClients = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
        // Fetch clients summary
        const clientsData = await adminService.getClientsSummary();
        console.log('=== CLIENTS DATA ===', clientsData);
        console.log('=== CLIENTS COUNT ===', clientsData.length);
        setClients(clientsData);

        // Fetch all users to get mediators
        const allUsers = await adminService.getAllUsers();
        console.log('=== ALL USERS ===', allUsers);
        const mediatorsData = allUsers.filter(user => user.role === 'MEDIATOR');
        setMediators(mediatorsData);

        applyFilters(clientsData, mediatorsData, searchQuery, activeTab, userType);
    } catch (error) {
        console.error('Error loading data:', error);
        console.error('Error details:', error.response?.data);
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
};
```

## Common Solutions

### Solution 1: No Clients Exist
If you have no clients in the database, create one:

1. Go to Admin Dashboard
2. Click the "+" button
3. Create a new client with initial investment

### Solution 2: Clients are PENDING
If clients exist but are in PENDING status:

1. Go to "Approvals" screen
2. Approve pending users
3. Return to Clients screen

### Solution 3: Portfolios Not Created
If users exist but portfolios don't:

The backend should auto-create portfolios, but you can manually trigger this by:
- Making a deposit request as the client
- Admin creating a manual transaction

### Solution 4: API Endpoint Mismatch
Check that the mobile app is calling the correct endpoint:
- Mobile expects: `/admin/clients`
- Backend provides: `/api/admin/clients`

The `apiClient` should have `baseURL: 'http://localhost:8080/api'`

## Quick Fix Commands

### Create a test client via SQL (if needed):
```sql
-- Insert a test user
INSERT INTO users (id, user_id, name, email, password, role, status, mobile, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'TEST001',
    'Test Client',
    'test@client.com',
    '$2a$10$YourHashedPassword',
    'CLIENT',
    'ACTIVE',
    '1234567890',
    NOW(),
    NOW()
);

-- Get the user ID
SET @user_id = (SELECT id FROM users WHERE email = 'test@client.com');

-- Create portfolio for the user
INSERT INTO portfolio (id, user_id, total_invested, total_value, profit_percentage, profit_accrual_status, available_profit, total_profit_earned, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    @user_id,
    100000,
    100000,
    0,
    'ACTIVE',
    0,
    0,
    NOW(),
    NOW()
);
```

## Next Steps

1. Check the backend console for errors
2. Test the API endpoint directly
3. Check the database for client records
4. Add console logging to the mobile app
5. Report back what you find!
