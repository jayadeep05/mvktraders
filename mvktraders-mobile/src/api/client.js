import axios from 'axios';
import { getAccessToken, getRefreshToken, saveAuthTokens, clearAuthTokens } from '../utils/secureStore';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.191:8080/api';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor
apiClient.interceptors.request.use(
    async (config) => {
        const token = await getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                await clearAuthTokens();
                // If we had a refresh endpoint, we would call it here
                return Promise.reject(error);
            } catch (refreshError) {
                await clearAuthTokens();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const portfolioService = {
    getMyPortfolio: async () => {
        const response = await apiClient.get('/portfolio/my');
        return response.data;
    }
};

export const profitService = {
    getMyHistory: async () => {
        const response = await apiClient.get('/client/profit/history');
        return response.data;
    }
};

export const depositService = {
    getMyRequests: async () => {
        const response = await apiClient.get('/client/deposit-requests');
        return response.data;
    },
    createWithdrawalRequest: async (amount) => {
        const response = await apiClient.post('/client/withdrawal-request', { amount });
        return response.data;
    },
    getMyWithdrawalRequests: async () => {
        const response = await apiClient.get('/client/withdrawal-requests');
        return response.data;
    },

    // Deposit Requests
    createDepositRequest: async (formData) => {
        // formData must contain: amount, screenshot (file), note (optional)
        const response = await apiClient.post('/client/deposit-request', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getMyDepositRequests: async () => {
        const response = await apiClient.get('/client/deposit-requests');
        return response.data;
    },
    createRequest: async (amount) => {
        const response = await apiClient.post('/client/withdrawal-request', { amount });
        return response.data;
    }
};

export const withdrawalService = {
    getMyRequests: async () => {
        const response = await apiClient.get('/client/withdrawal-requests');
        return response.data;
    },
    createRequest: async (amount) => {
        const response = await apiClient.post('/client/withdrawal-request', { amount });
        return response.data;
    }
};

export const clientService = {
    getTransactions: async () => {
        const response = await apiClient.get('/client/transactions');
        return response.data;
    },
    updatePassword: async (currentPassword, newPassword) => {
        const response = await apiClient.post('/client/change-password', { currentPassword, newPassword });
        return response.data;
    },
    // Deposit Requests
    createDepositRequest: async (formData) => {
        const response = await apiClient.post('/client/deposit-request', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
    getMyDepositRequests: async () => {
        const response = await apiClient.get('/client/deposit-requests');
        return response.data;
    },
};

export default apiClient;
