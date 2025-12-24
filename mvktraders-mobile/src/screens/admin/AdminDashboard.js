import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function AdminDashboard() {
    const { logout, user } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Admin Dashboard</Text>
                <Text style={styles.userInfo}>Logged in as: {user?.email}</Text>
                <Text style={styles.roleInfo}>Role: {user?.role}</Text>

                <View style={{ marginTop: 20 }}>
                    <Button title="Logout" onPress={logout} color={colors.error} />
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        color: colors.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    userInfo: {
        color: colors.textSecondary,
        marginBottom: 5,
    },
    roleInfo: {
        color: colors.primary,
        fontWeight: '600',
        marginBottom: 20,
    }
});
