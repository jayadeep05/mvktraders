import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme } from '../theme/colors';
import * as SecureStore from 'expo-secure-store';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(true); // Default to dark mode for now

    useEffect(() => {
        // Load saved theme preference
        const loadTheme = async () => {
            try {
                const savedTheme = await SecureStore.getItemAsync('user_theme_preference');
                if (savedTheme) {
                    setIsDark(savedTheme === 'dark');
                } else {
                    // If no preference, default to dark (as per user's original design) or system
                    setIsDark(true);
                }
            } catch (e) {
                console.log('Failed to load theme', e);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            await SecureStore.setItemAsync('user_theme_preference', newMode ? 'dark' : 'light');
        } catch (e) {
            console.log('Failed to save theme', e);
        }
    };

    const theme = isDark ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
