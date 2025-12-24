import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Better than generic SafeAreaView
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            // Navigation is handled by AppNavigator listening to auth state
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Login failed';
            Alert.alert('Login Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="bar-chart" size={32} color="#fff" />
                    </View>
                    <Text style={styles.title}>
                        MVK<Text style={styles.titleHighlight}>TRADERS</Text>
                    </Text>
                    <Text style={styles.subtitle}>Secure terminal for wealth management</Text>
                </View>

                <View style={styles.formContainer}>
                    {/* Email Input */}
                    <Text style={styles.label}>USER IDENTITY</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter UserId or Email"
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    {/* Password Input */}
                    <Text style={styles.label}>SECURITY KEY</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.textSecondary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color={colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={styles.buttonContent}>
                                <Text style={styles.buttonText}>Sign In</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <View style={styles.badge}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                        <Text style={styles.badgeText}>AES-256 Encryption</Text>
                    </View>
                    <View style={styles.badge}>
                        <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
                        <Text style={styles.badgeText}>Real-time Sync</Text>
                    </View>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoContainer: {
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: colors.primary, // Simplified gradient fallback
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: colors.textPrimary,
        letterSpacing: -1,
    },
    titleHighlight: {
        color: '#818cf8',
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
    },
    formContainer: {
        backgroundColor: colors.cardData,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.inputBorder,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        borderRadius: 14,
        height: 50,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 15,
    },
    eyeIcon: {
        padding: 4,
    },
    button: {
        marginTop: 32,
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    buttonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginRight: 8,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
        gap: 20,
        opacity: 0.8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
});
