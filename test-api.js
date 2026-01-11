// Test API Endpoints
// Run this in your browser console or use a REST client

const API_BASE = 'http://10.217.28.236:8080/api';

// Get your auth token from the app
// You can find it in: React Native Debugger > AsyncStorage or SecureStore

const token = 'YOUR_AUTH_TOKEN_HERE';

// Test 1: Get all clients
fetch(`${API_BASE}/admin/clients`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
    .then(res => res.json())
    .then(data => {
        console.log('✅ Clients:', data);
        console.log('📊 Count:', data.length);
    })
    .catch(err => console.error('❌ Error:', err));

// Test 2: Get all users
fetch(`${API_BASE}/admin/users`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
    .then(res => res.json())
    .then(data => {
        console.log('✅ All Users:', data);
        console.log('📊 Count:', data.length);
        console.log('👥 Clients:', data.filter(u => u.role === 'CLIENT'));
        console.log('🛡️ Mediators:', data.filter(u => u.role === 'MEDIATOR'));
        console.log('👑 Admins:', data.filter(u => u.role === 'ADMIN'));
    })
    .catch(err => console.error('❌ Error:', err));

// Test 3: Get deposit requests (this one works for you)
fetch(`${API_BASE}/admin/deposit-requests`, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
})
    .then(res => res.json())
    .then(data => {
        console.log('✅ Deposit Requests:', data);
        console.log('📊 Count:', data.length);
    })
    .catch(err => console.error('❌ Error:', err));
