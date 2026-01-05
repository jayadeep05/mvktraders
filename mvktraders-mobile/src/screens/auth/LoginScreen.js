import React, { useState, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
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
                        <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter UserId or Email"
                            placeholderTextColor={theme.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    {/* Password Input */}
                    <Text style={styles.label}>SECURITY KEY</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={theme.textSecondary}
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
                                color={theme.textSecondary}
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
                        <Ionicons name="shield-checkmark-outline" size={14} color={theme.success} />
                        <Text style={styles.badgeText}>AES-256 Encryption</Text>
                    </View>
                    <View style={styles.badge}>
                        <Ionicons name="trending-up-outline" size={14} color={theme.primary} />
                        <Text style={styles.badgeText}>Real-time Sync</Text>
                    </View>
                </View>

            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
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
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.headerText,
        letterSpacing: -1,
    },
    titleHighlight: {
        color: theme.primary,
    },
    subtitle: {
        fontSize: 14,
        color: theme.textSecondary,
        marginTop: 8,
    },
    formContainer: {
        backgroundColor: theme.cardBg,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    label: {
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.inputBackground,
        borderWidth: 1,
        borderColor: theme.inputBorder,
        borderRadius: 14,
        height: 50,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: theme.textPrimary,
        fontSize: 15,
    },
    eyeIcon: {
        padding: 4,
    },
    button: {
        marginTop: 32,
        backgroundColor: theme.primary,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.primary,
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
        color: '#ffffff',
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
        color: theme.textSecondary,
        fontSize: 12,
        fontWeight: '500',
    },
});
