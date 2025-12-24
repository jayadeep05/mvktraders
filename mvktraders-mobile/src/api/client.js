import axios from 'axios';
import { getAccessToken, getRefreshToken, saveAuthTokens, clearAuthTokens } from '../utils/secureStore';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://13.48.212.110:8080/api';

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

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // NOTE: The current backend implementation (AuthenticationController) does NOT 
                // seem to expose a specific /refresh-token endpoint yet, although it issues refresh tokens.
                // If an endpoint strictly for refreshing exists (or is added in future), uncomment below:

                /*
                const refreshToken = await getRefreshToken();
                if (!refreshToken) throw new Error('No refresh token');
                
                const response = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
                const { access_token, refresh_token } = response.data;
                
                await saveAuthTokens(access_token, refresh_token);
                
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return apiClient(originalRequest);
                */

                // For now, since we cannot modify backend and no endpoint exists,
                // we must treat 401 as a hard logout signal.
                await clearAuthTokens();
                return Promise.reject(error);

            } catch (refreshError) {
                await clearAuthTokens();
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;
