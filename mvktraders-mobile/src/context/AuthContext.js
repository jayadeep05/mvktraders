import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/client';
import { saveAuthTokens, clearAuthTokens, getAccessToken } from '../utils/secureStore';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const parseUserFromToken = (token) => {
        try {
            const decoded = jwtDecode(token);
            // Determine role based on 'rol' or 'roles' claim
            const role = decoded.rol ? decoded.rol[0] : (decoded.roles ? decoded.roles[0] : null);
            return {
                email: decoded.sub,
                role: role,
                ...decoded
            };
        } catch (e) {
            console.error("Token decoding failed", e);
            return null;
        }
    };

    const checkLogin = async () => {
        try {
            const token = await getAccessToken();
            if (token) {
                const userData = parseUserFromToken(token);
                // Check expiry if possible
                if (userData && userData.exp * 1000 > Date.now()) {
                    setUser(userData);
                } else {
                    await logout(); // Token expired
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkLogin();
    }, []);

    const login = async (email, password) => {
        try {
            // Endpoint is /auth/login based on current backend
            const response = await apiClient.post('/auth/login', { email, password });
            const { access_token, refresh_token } = response.data;

            await saveAuthTokens(access_token, refresh_token);

            const userData = parseUserFromToken(access_token);
            setUser(userData);
            return true;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const setSession = async (access_token, refresh_token) => {
        try {
            await saveAuthTokens(access_token, refresh_token);
            const userData = parseUserFromToken(access_token);
            setUser(userData);
            return true;
        } catch (error) {
            console.error("Set session failed", error);
            return false;
        }
    };

    const logout = async () => {
        await clearAuthTokens();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, setSession }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
