import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/auth/LoginScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import ClientDashboard from '../screens/client/ClientDashboard';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Determine which stack to show based on user role
    // Web: if (role === 'ROLE_ADMIN' || role === 'ADMIN' || role === 'ROLE_MEDIATOR' || role === 'MEDIATOR')
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN' || user?.role === 'MEDIATOR' || user?.role === 'ROLE_MEDIATOR';

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : isAdmin ? (
                    // Admin Stack
                    <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
                ) : (
                    // Client Stack
                    <Stack.Screen name="ClientDashboard" component={ClientDashboard} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}
