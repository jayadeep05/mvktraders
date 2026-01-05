import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.access_token) {
            localStorage.setItem('token', response.data.access_token);
            localStorage.setItem('refresh_token', response.data.refresh_token);
        }
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
    },
    changePassword: async (currentPassword, newPassword, confirmationPassword) => {
        const response = await api.patch('/auth/change-password', {
            currentPassword,
            newPassword,
            confirmationPassword
        });
        return response.data;
    },
};

export const clientService = {
    getDashboard: async () => {
        const response = await api.get('/client/dashboard');
        return response.data;
    },
    getTransactions: async () => {
        const response = await api.get('/client/transactions');
        return response.data;
    }
};

export const adminService = {
    getUsers: async () => {
        const response = await api.get('/admin/users');
        return response.data;
    },
    createUser: async (userData) => {
        const response = await api.post('/admin/users', userData);
        return response.data;
    },
    getUsersSummary: async () => {
        const response = await api.get('/admin/users-summary');
        return response.data;
    },
    getAllClientsSummary: async () => {
        const response = await api.get('/admin/clients');
        return response.data;
    },
    getClientPortfolio: async (id) => {
        const response = await api.get(`/admin/client/${id}/portfolio`);
        return response.data;
    },
    seedSampleClients: async () => {
        const response = await api.post('/admin/dev/seed-sample-clients');
        return response.data;
    },
    getAuthStatus: async () => {
        const response = await api.get('/admin/debug/auth-status');
        return response.data;
    },
    getCounts: async () => {
        const response = await api.get('/admin/debug/counts');
        return response.data;
    },
    createClient: async (clientData) => {
        const response = await api.post('/admin/create-client', clientData);
        return response.data;
    },
    createMediator: async (mediatorData) => {
        const response = await api.post('/admin/create-mediator', mediatorData);
        return response.data;
    },
    updateUser: async (id, userData) => {
        const response = await api.put(`/admin/users/${id}`, userData);
        return response.data;
    },
    impersonateUser: async (userId) => {
        const response = await api.post(`/admin/impersonate/${userId}`);
        return response.data;
    },
    getAllUsers: async () => {
        const response = await api.get('/admin/users');
        return response.data;
    },
    getPendingUsers: async () => {
        const response = await api.get('/admin/pending-users');
        return response.data;
    },
    approveUser: async (id) => {
        const response = await api.post(`/admin/users/${id}/approve`);
        return response.data;
    },
    rejectUser: async (id) => {
        const response = await api.post(`/admin/users/${id}/reject`);
        return response.data;
    },
    payout: async (formData) => {
        // formData is already populated with userId, amount, screenshot
        // Ensure message is also appended if passed in the formData
        const response = await api.post('/admin/payout', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    getClientTransactions: async (id) => {
        const response = await api.get(`/admin/clients/${id}/transactions`);
        return response.data;
    },
    deleteUser: async (userId, password) => {
        const response = await api.post(`/admin/users/${userId}/delete`, { password });
        return response.data;
    },
    getDeleteRequests: async () => {
        const response = await api.get('/admin/delete-requests');
        return response.data;
    },
    approveDeleteRequest: async (requestId, password) => {
        const response = await api.post(`/admin/delete-requests/${requestId}/approve`, { password });
        return response.data;
    },
    rejectDeleteRequest: async (requestId) => {
        const response = await api.post(`/admin/delete-requests/${requestId}/reject`);
        return response.data;
    }
};

export const mediatorService = {
    createClientRequest: async (clientData) => {
        const response = await api.post('/mediator/client', clientData);
        return response.data;
    },
    getClients: async () => {
        const response = await api.get('/mediator/clients');
        return response.data;
    },
    getPortfolios: async () => {
        const response = await api.get('/mediator/portfolios');
        return response.data;
    },
    getPendingUsers: async () => {
        const response = await api.get('/mediator/pending-users');
        return response.data;
    },
    createDepositRequest: async (userId, amount, note) => {
        const response = await api.post(`/mediator/deposit-request/${userId}`, { amount, note });
        return response.data;
    },
    createWithdrawalRequest: async (userId, amount, reason) => {
        const response = await api.post(`/mediator/withdrawal-request/${userId}`, { amount, reason });
        return response.data;
    },
    createPayoutRequest: async (userId, amount, note) => {
        const response = await api.post(`/mediator/payout-request/${userId}`, { amount, note });
        return response.data;
    },
    requestClientDeletion: async (userId, reason) => {
        const response = await api.post(`/mediator/clients/${userId}/request-delete`, { reason });
        return response.data;
    },
    getDeleteRequests: async () => {
        const response = await api.get('/mediator/delete-requests');
        return response.data;
    },
    impersonateClient: async (clientId) => {
        const response = await api.post(`/mediator/impersonate/${clientId}`);
        return response.data;
    }
};

export const portfolioService = {
    getMyPortfolio: async () => {
        const response = await api.get('/portfolio/my');
        return response.data;
    },
    getAllPortfolios: async () => {
        const response = await api.get('/portfolio/all');
        return response.data;
    }
};

export const withdrawalService = {
    // Client endpoints
    createRequest: async (amount) => {
        const response = await api.post('/client/withdrawal-request', { amount });
        return response.data;
    },
    getMyRequests: async () => {
        const response = await api.get('/client/withdrawal-requests');
        return response.data;
    },

    // Admin endpoints
    createRequestForUser: async (userId, amount) => {
        const response = await api.post(`/admin/withdrawal-request/${userId}`, { amount });
        return response.data;
    },
    getAllRequests: async () => {
        const response = await api.get('/admin/withdrawal-requests');
        return response.data;
    },
    approveRequest: async (id) => {
        const response = await api.post(`/admin/withdrawal-requests/${id}/approve`, {});
        return response.data;
    },
    rejectRequest: async (id, reason) => {
        const response = await api.post(`/admin/withdrawal-requests/${id}/reject`, { reason });
        return response.data;
    }
};

export const profitService = {
    // Admin
    calculateAll: async (month, year) => {
        const response = await api.post('/admin/profit/calculate-all', null, { params: { month, year } });
        return response.data;
    },
    calculateForUser: async (userId, month, year) => {
        const response = await api.post(`/admin/profit/calculate/${userId}`, null, { params: { month, year } });
        return response.data;
    },
    updateConfig: async (userId, config) => { // config: { profitPercentage, status }
        const response = await api.put(`/admin/profit/config/${userId}`, config);
        return response.data;
    },
    getHistory: async (userId) => {
        const response = await api.get(`/admin/profit/history/${userId}`);
        return response.data;
    },

    // Client
    getMyHistory: async () => {
        const response = await api.get('/client/profit/history');
        return response.data;
    }
};

export const depositService = {
    // Client
    createRequest: async (amount, note) => {
        const response = await api.post('/client/deposit-request', { amount, note });
        return response.data;
    },
    getMyRequests: async () => {
        const response = await api.get('/client/deposit-requests');
        return response.data;
    },

    // Admin
    createRequestForUser: async (userId, amount, note) => {
        const response = await api.post(`/admin/deposit-request/${userId}`, { amount, note });
        return response.data;
    },
    getAllRequests: async (status) => {
        const params = status ? { status } : {};
        const response = await api.get('/admin/deposit-requests', { params });
        return response.data;
    },
    approveRequest: async (id) => {
        const response = await api.post(`/admin/deposit-requests/${id}/approve`, {});
        return response.data;
    },
    rejectRequest: async (id) => {
        const response = await api.post(`/admin/deposit-requests/${id}/reject`);
        return response.data;
    }
};

export default api;
