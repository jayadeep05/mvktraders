const API_URL = 'http://localhost:8080/api';

async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@mvktraders.com',
                password: 'password123'
            })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Logged in. Token acquired.');

        // 2. Trigger Calculation
        console.log('Triggering profit calculation for Jan 2026...');
        const calcRes = await fetch(`${API_URL}/admin/profit/calculate?month=1&year=2026`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!calcRes.ok) {
            throw new Error(`Calculation failed: ${calcRes.status} ${await calcRes.text()}`);
        }

        const calcData = await calcRes.json();
        console.log('Calculation Result:', calcData);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

run();
