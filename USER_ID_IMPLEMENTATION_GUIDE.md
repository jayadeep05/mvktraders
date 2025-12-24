# User ID Implementation Guide

## Overview
This document describes the implementation of the business identifier `userId` (format: MKT0000001) for the investment analytics system.

## Core Principles
- **Internal `id` (UUID)**: Remains the PRIMARY KEY, never exposed externally
- **Business `userId`**: Public-facing identifier used in all APIs, UI, and business operations
- **Format**: `MKT` + 7-digit zero-padded number (e.g., MKT0000001, MKT0000002)

---

## Database Changes

### 1. Add Column to `users` Table

```sql
ALTER TABLE users 
ADD COLUMN user_id VARCHAR(20);
```

### 2. Populate Existing Users

**PostgreSQL:**
```sql
DO $$
DECLARE
    user_record RECORD;
    counter INTEGER := 1;
    new_user_id VARCHAR(20);
BEGIN
    FOR user_record IN 
        SELECT id FROM users ORDER BY created_at ASC
    LOOP
        new_user_id := 'MKT' || LPAD(counter::TEXT, 7, '0');
        UPDATE users SET user_id = new_user_id WHERE id = user_record.id;
        counter := counter + 1;
    END LOOP;
END $$;
```

**MySQL:**
```sql
SET @counter = 0;
UPDATE users 
SET user_id = CONCAT('MKT', LPAD((@counter := @counter + 1), 7, '0'))
ORDER BY created_at ASC;
```

### 3. Add Constraints

```sql
ALTER TABLE users 
ADD CONSTRAINT users_user_id_unique UNIQUE (user_id);

CREATE INDEX idx_users_user_id ON users(user_id);
```

---

## Backend Changes

### Files Modified:

1. **User.java** - Added `userId` field
2. **UserRepository.java** - Added userId lookup methods
3. **UserIdGeneratorService.java** - NEW: Generates sequential userId
4. **AuthenticationService.java** - Generates userId on user creation
5. **JwtService.java** - Includes userId in JWT tokens

### Key Components:

#### UserIdGeneratorService
```java
@Service
public class UserIdGeneratorService {
    public synchronized String generateUserId() {
        // Finds highest existing number and increments
        // Returns: MKT0000001, MKT0000002, etc.
    }
}
```

#### User Entity
```java
@Column(name = "user_id", unique = true, length = 20)
private String userId; // Business identifier: MKT0000001
```

#### UserRepository Methods
```java
Optional<User> findByUserId(String userId);
boolean existsByUserId(String userId);
Optional<User> findTopByUserIdStartingWithOrderByUserIdDesc(String prefix);
```

---

## Migration Steps

### Step 1: Run Database Migration
Choose the appropriate script for your database:
- PostgreSQL: `add_user_id_column.sql`
- MySQL: `add_user_id_column_mysql.sql`

### Step 2: Restart Backend
The backend will automatically:
- Generate userId for new users
- Include userId in JWT tokens
- Use userId in audit logs

### Step 3: Verify Migration
```sql
SELECT id, user_id, name, email, role, created_at 
FROM users 
ORDER BY user_id;
```

Expected output:
```
id                                   | user_id     | name        | email
-------------------------------------|-------------|-------------|------------------
uuid-1                               | MKT0000001  | Admin User  | admin@...
uuid-2                               | MKT0000002  | John Doe    | john@...
uuid-3                               | MKT0000003  | Jane Smith  | jane@...
```

---

## Frontend Changes Required

### JWT Token Structure
The JWT token now includes:
```json
{
  "userId": "MKT0000001",  // Business identifier (was UUID)
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["ROLE_CLIENT"]
}
```

### UI Updates Needed:
1. **Profile Display**: Show `userId` instead of internal id
2. **Admin Dashboards**: Display userId in user lists
3. **API Calls**: Use userId for user-specific operations
4. **Reports**: Include userId in exports and reports

---

## API Usage Examples

### Before (Internal ID):
```javascript
// ❌ Old way - using internal UUID
GET /api/admin/users/550e8400-e29b-41d4-a716-446655440000
```

### After (Business ID):
```javascript
// ✅ New way - using business userId
GET /api/admin/users/MKT0000001
```

---

## Security Considerations

### ✅ What's Protected:
- Internal UUID `id` never exposed in APIs
- userId is sequential but doesn't reveal sensitive data
- All database operations still use internal UUID for joins

### ✅ What's Public:
- userId (MKT0000001) is safe to display
- Used in UI, reports, and customer communications
- Easier for support and auditing

---

## Testing Checklist

- [ ] Database migration completed successfully
- [ ] Existing users have userId populated
- [ ] New user registration generates userId
- [ ] JWT tokens include userId
- [ ] No APIs expose internal UUID
- [ ] Frontend displays userId correctly
- [ ] Audit logs use userId
- [ ] Reports show userId

---

## Rollback Plan

If issues occur:

```sql
-- Remove userId column
ALTER TABLE users DROP COLUMN user_id;

-- Revert backend code
git revert <commit-hash>
```

---

## Future Enhancements

1. **Custom Prefixes**: Different prefixes for different user types
   - Clients: `CLT0000001`
   - Admins: `ADM0000001`
   - Mediators: `MED0000001`

2. **QR Codes**: Generate QR codes with userId for easy identification

3. **Search**: Add full-text search on userId

---

## Support

For issues or questions:
1. Check migration logs
2. Verify userId uniqueness: `SELECT user_id, COUNT(*) FROM users GROUP BY user_id HAVING COUNT(*) > 1;`
3. Ensure sequence is correct: `SELECT MAX(CAST(SUBSTRING(user_id, 4) AS INTEGER)) FROM users;`
