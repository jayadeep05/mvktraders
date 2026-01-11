import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import {
    ArrowLeft,
    UserPlus,
    Check,
    User,
    Mail,
    Phone,
    Lock,
    TrendingUp,
    ShieldCheck,
    Briefcase,
    Info,
    CheckCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminCreateUser({ navigation }) {
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [isMediator, setIsMediator] = useState(false);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
        investmentAmount: ''
    });

    const updateForm = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!form.name || !form.email || !form.mobile) {
            Alert.alert('Incomplete Form', 'Please fill in all required fields to proceed.');
            return;
        }

        if (!isMediator && !form.investmentAmount) {
            Alert.alert('Investment Required', 'Please specify the initial investment amount for the client.');
            return;
        }

        setLoading(true);
        try {
            if (isMediator) {
                await adminService.createMediator({
                    name: form.name,
                    email: form.email,
                    mobile: form.mobile,
                    password: form.password
                });
                Alert.alert('Success', 'Mediator account has been created successfully!');
            } else {
                await adminService.createClient({
                    fullName: form.name,
                    phoneNumber: form.mobile,
                    password: form.password,
                    investmentAmount: parseFloat(form.investmentAmount)
                });
                Alert.alert('Success', 'Client account has been created successfully!');
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Creation Failed', error.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderInput = (label, placeholder, value, key, icon, keyboardType = 'default', secure = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={styles.inputWrapper}>
                <View style={styles.inputIconBox}>
                    {icon}
                </View>
                <TextInput
                    style={styles.textInput}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textSecondary}
                    value={value}
                    onChangeText={t => updateForm(key, t)}
                    keyboardType={keyboardType}
                    secureTextEntry={secure}
                    autoCapitalize={key === 'email' ? 'none' : 'words'}
                />
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Onboard User</Text>
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerBadgeText}>NEW ENTRY</Text>
                    </View>
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Welcome Header */}
                    <View style={styles.welcomeBanner}>
                        <Text style={styles.bannerTitle}>Account Type</Text>
                        <Text style={styles.bannerSub}>Choose the role and fill in the details below</Text>
                    </View>

                    {/* Role Toggle */}
                    <View style={styles.roleToggleWrapper}>
                        <TouchableOpacity
                            style={[styles.roleBtn, !isMediator && styles.roleBtnActive]}
                            onPress={() => setIsMediator(false)}
                            activeOpacity={0.8}
                        >
                            <User size={18} color={!isMediator ? '#fff' : theme.textSecondary} />
                            <Text style={[styles.roleBtnText, !isMediator && styles.roleBtnTextActive]}>Client</Text>
                            {!isMediator && <View style={styles.activeDot} />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.roleBtn, isMediator && styles.roleBtnActive]}
                            onPress={() => setIsMediator(true)}
                            activeOpacity={0.8}
                        >
                            <Briefcase size={18} color={isMediator ? '#fff' : theme.textSecondary} />
                            <Text style={[styles.roleBtnText, isMediator && styles.roleBtnTextActive]}>Mediator</Text>
                            {isMediator && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    </View>

                    {/* Section: Identity */}
                    <View style={styles.formSection}>
                        <View style={styles.sectionHeadingRow}>
                            <ShieldCheck size={18} color={theme.primary} />
                            <Text style={styles.sectionHeading}>IDENTIFICATION</Text>
                        </View>

                        {renderInput('FULL NAME', 'e.g. John Doe', form.name, 'name', <User size={18} color={theme.primary} />)}
                        {renderInput('EMAIL ADDRESS', 'example@domain.com', form.email, 'email', <Mail size={18} color={theme.primary} />, 'email-address')}
                        {renderInput('PHONE NUMBER', '+91 98765 43210', form.mobile, 'mobile', <Phone size={18} color={theme.primary} />, 'phone-pad')}
                        {renderInput('ACCESS PASSWORD', 'Leave empty for auto-gen', form.password, 'password', <Lock size={18} color={theme.primary} />, 'default', true)}
                    </View>

                    {/* Section: Portfolio (Client Only) */}
                    {!isMediator && (
                        <View style={[styles.formSection, styles.extraPadding]}>
                            <View style={styles.sectionHeadingRow}>
                                <TrendingUp size={18} color={theme.success} />
                                <Text style={[styles.sectionHeading, { color: theme.success }]}>PORTFOLIO SETUP</Text>
                            </View>

                            <View style={styles.infoBox}>
                                <Info size={16} color={theme.success} />
                                <Text style={styles.infoText}>Initial capital will be recorded as the starting balance.</Text>
                            </View>

                            {renderInput('INITIAL INVESTMENT', '0.00', form.investmentAmount, 'investmentAmount', <TrendingUp size={18} color={theme.success} />, 'decimal-pad')}
                        </View>
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={isDark ? ['#312e81', '#1e1b4b'] : [theme.primary, theme.primary + 'DD']}
                            style={styles.submitGradient}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <CheckCircle size={22} color="#fff" />
                                    <Text style={styles.submitText}>Finalize & Create Account</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.background },
    headerTitleContainer: { flex: 1, marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    backBtn: { padding: 4 },
    headerBadge: { backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    headerBadgeText: { color: theme.primary, fontSize: 10, fontWeight: '800' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

    // Welcome
    welcomeBanner: { marginBottom: 24 },
    bannerTitle: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    bannerSub: { fontSize: 14, color: theme.textSecondary, fontWeight: '500' },

    // Role Toggle
    roleToggleWrapper: { flexDirection: 'row', backgroundColor: theme.cardBg, borderRadius: 20, padding: 6, marginBottom: 30, borderWidth: 1, borderColor: theme.cardBorder, gap: 6 },
    roleBtn: { flex: 1, height: 48, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    roleBtnActive: { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    roleBtnText: { fontSize: 15, fontWeight: '700', color: theme.textSecondary },
    roleBtnTextActive: { color: '#fff' },
    activeDot: { position: 'absolute', top: 8, right: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },

    // Form Sections
    formSection: { marginBottom: 30 },
    extraPadding: { marginTop: 10 },
    sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    sectionHeading: { fontSize: 11, fontWeight: '800', color: theme.primary, letterSpacing: 1.5 },

    // Inputs
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 18, height: 58, borderWidth: 1, borderColor: theme.cardBorder },
    inputIconBox: { width: 54, height: '100%', alignItems: 'center', justifyContent: 'center' },
    textInput: { flex: 1, paddingRight: 16, fontSize: 16, fontWeight: '600', color: theme.textPrimary },

    infoBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: theme.success + '08', borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.success + '15' },
    infoText: { flex: 1, fontSize: 12, color: theme.success, fontWeight: '600', lineHeight: 18 },

    // Submit
    submitBtn: { height: 62, borderRadius: 20, overflow: 'hidden', marginTop: 10, shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
    submitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 17 }
});
