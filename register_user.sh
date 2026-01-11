curl -v -X POST http://localhost:8080/api/auth/register \
-H "Content-Type: application/json" \
-d '{"name": "Admin User 2", "email": "admin2@mvktraders.com", "password": "password123", "role": "ADMIN"}'
