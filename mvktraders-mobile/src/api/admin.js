import apiClient from './client';

export const adminService = {
    // Client Management
    getClientsSummary: async () => {
        const response = await apiClient.get('/admin/clients');
        return response.data;
    },
    getInactiveClientsSummary: async () => {
        const response = await apiClient.get('/admin/clients/inactive');
        return response.data;
    },
    getMediatorClients: async (id) => {
        const response = await apiClient.get(`/admin/mediator/${id}/clients`);
        return response.data;
    },
    getAllUsers: async () => {
        const response = await apiClient.get('/admin/users');
        return response.data;
    },
    getPendingUsers: async () => {
        const response = await apiClient.get('/admin/pending-users');
        return response.data;
    },
    getClientPortfolio: async (id) => {
        const response = await apiClient.get(`/admin/client/${id}/portfolio`);
        return response.data;
    },
    getClientTransactions: async (id) => {
        const response = await apiClient.get(`/admin/clients/${id}/transactions`);
        return response.data;
    },
    approveUser: async (id) => {
        const response = await apiClient.post(`/admin/users/${id}/approve`);
        return response.data;
    },
    rejectUser: async (id) => {
        const response = await apiClient.post(`/admin/users/${id}/reject`);
        return response.data;
    },
    deleteUser: async (id) => {
        const response = await apiClient.delete(`/admin/users/${id}`);
        return response.data;
    },
    reactivateUser: async (id) => {
        const response = await apiClient.post(`/admin/users/${id}/reactivate`);
        return response.data;
    },
    deleteUserPermanently: async (id) => {
        const response = await apiClient.delete(`/admin/users/${id}/permanent`);
        return response.data;
    },
    createClient: async (clientData) => {
        // clientData: { fullName, password, phoneNumber, investmentAmount }
        const response = await apiClient.post('/admin/create-client', clientData);
        return response.data;
    },
    createMediator: async (mediatorData) => {
        // mediatorData: { name, email, password, mobile }
        const response = await apiClient.post('/admin/create-mediator', mediatorData);
        return response.data;
    },
    updateUser: async (id, userData) => {
        const response = await apiClient.put(`/admin/users/${id}`, userData);
        return response.data;
    },
    impersonateUser: async (id) => {
        const response = await apiClient.post(`/admin/impersonate/${id}`);
        return response.data;
    },
    createManualTransaction: async (clientId, data) => {
        // data: { amount, type: 'DEPOSIT' | 'WITHDRAWAL', note }
        const response = await apiClient.post(`/admin/client/${clientId}/transaction`, data);
        return response.data;
    },

    // Withdrawal Management
    getAllWithdrawalRequests: async () => {
        const response = await apiClient.get('/admin/withdrawal-requests');
        return response.data;
    },
    approveWithdrawalRequest: async (id, paymentMode) => {
        const response = await apiClient.post(`/admin/withdrawal-requests/${id}/approve`, { paymentMode });
        return response.data;
    },
    rejectWithdrawalRequest: async (id, reason) => {
        const response = await apiClient.post(`/admin/withdrawal-requests/${id}/reject`, { reason });
        return response.data;
    },

    // Deposit Request Management
    getAllDepositRequests: async () => {
        const response = await apiClient.get('/admin/deposit-requests');
        return response.data;
    },
    approveDepositRequest: async (id, note) => {
        const response = await apiClient.post(`/admin/deposit-requests/${id}/approve`, { note });
        return response.data;
    },
    rejectDepositRequest: async (id, reason) => {
        const response = await apiClient.post(`/admin/deposit-requests/${id}/reject`, { reason });
        return response.data;
    },

    // Payouts
    createPayout: async (formData) => {
        // formData must be an instance of FormData with: userId, amount, message, screenshot (file)
        const response = await apiClient.post('/admin/payout', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Delete Request Management
    getAllDeleteRequests: async () => {
        const response = await apiClient.get('/admin/delete-requests');
        return response.data;
    },
    approveDeleteRequest: async (id, password) => {
        const response = await apiClient.post(`/admin/delete-requests/${id}/approve`, { password });
        return response.data;
    },
    rejectDeleteRequest: async (id) => {
        const response = await apiClient.post(`/admin/delete-requests/${id}/reject`);
        return response.data;
    },

    // Profit Management
    getProfitConfigs: async () => {
        const response = await apiClient.get('/admin/profit/config');
        return response.data;
    },
    updateProfitConfigs: async (configs) => {
        const response = await apiClient.put('/admin/profit/config', configs);
        return response.data;
    },
    calculateProfit: async (month, year) => {
        const response = await apiClient.post(`/admin/profit/calculate?month=${month}&year=${year}`);
        return response.data;
    },
    updateClientProfitConfig: async (clientId, config) => {
        const response = await apiClient.put(`/admin/client/${clientId}/profit-config`, config);
        return response.data;
    },

    // Global Configuration
    getGlobalConfigs: async () => {
        const response = await apiClient.get('/admin/config');
        return response.data;
    },
    updateGlobalConfigs: async (configs) => {
        const response = await apiClient.put('/admin/config', configs);
        return response.data;
    }
};
