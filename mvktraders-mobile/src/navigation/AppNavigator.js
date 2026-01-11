import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Admin
import AdminDashboard from '../screens/admin/AdminDashboard';
import AdminApprovals from '../screens/admin/AdminApprovals';
import AdminWithdrawals from '../screens/admin/AdminWithdrawals';
import AdminDeposits from '../screens/admin/AdminDeposits';
import AdminClients from '../screens/admin/AdminClients';
import AdminClientDetails from '../screens/admin/AdminClientDetails';
import AdminCreateUser from '../screens/admin/AdminCreateUser';
import AdminDeleteRequests from '../screens/admin/AdminDeleteRequests';
import AdminMediatorDetails from '../screens/admin/AdminMediatorDetails';

// Client
import ClientDashboard from '../screens/client/ClientDashboard';
import DepositScreen from '../screens/client/DepositScreen';
import WithdrawalScreen from '../screens/client/WithdrawalScreen';

// Shared
import ProfileScreen from '../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { user, isLoading } = useAuth();
    const { theme, isDark } = useTheme();

    const navigationTheme = useMemo(() => {
        const baseTheme = isDark ? DarkTheme : DefaultTheme;
        return {
            ...baseTheme,
            colors: {
                ...baseTheme.colors,
                primary: theme.primary,
                background: theme.background,
                card: theme.cardBg,
                text: theme.textPrimary,
                border: theme.cardBorder,
                notification: theme.error,
            },
        };
    }, [isDark, theme]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN' || user?.role === 'MEDIATOR' || user?.role === 'ROLE_MEDIATOR';

    return (
        <NavigationContainer theme={navigationTheme}>
            <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
                {!user ? (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : isAdmin ? (
                    // Admin Stack
                    <>
                        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                        <Stack.Screen name="AdminApprovals" component={AdminApprovals} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminWithdrawals" component={AdminWithdrawals} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminDeposits" component={AdminDeposits} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminClients" component={AdminClients} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminClientDetails" component={AdminClientDetails} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminCreateUser" component={AdminCreateUser} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminDeleteRequests" component={AdminDeleteRequests} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="AdminMediatorDetails" component={AdminMediatorDetails} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
                    </>
                ) : (
                    // Client Stack
                    <>
                        <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
                        <Stack.Screen name="Deposit" component={DepositScreen} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ animation: 'slide_from_right' }} />
                        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
