import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'user_access_token';
const REFRESH_KEY = 'user_refresh_token';

// Helper to check if we are on web, since SecureStore doesn't work on web
const isWeb = Platform.OS === 'web';

export const saveAuthTokens = async (accessToken, refreshToken) => {
    if (isWeb) {
        localStorage.setItem(TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
        }
    }
};

export const getAccessToken = async () => {
    if (isWeb) {
        return localStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const getRefreshToken = async () => {
    if (isWeb) {
        return localStorage.getItem(REFRESH_KEY);
    }
    return await SecureStore.getItemAsync(REFRESH_KEY);
};

export const clearAuthTokens = async () => {
    if (isWeb) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
    } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
};
