import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { ArrowLeft, UserPlus, Check } from 'lucide-react-native';

export default function AdminCreateUser({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [isMediator, setIsMediator] = useState(false);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        mobile: '',
        password: '',
        investmentAmount: '' // Only for Client
    });

    const updateForm = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!form.name || !form.email || !form.mobile) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        if (!isMediator && !form.investmentAmount) {
            Alert.alert('Error', 'Investment Amount is required for Clients');
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
                Alert.alert('Success', 'Mediator created successfully');
            } else {
                await adminService.createClient({
                    fullName: form.name,
                    phoneNumber: form.mobile,
                    password: form.password,
                    investmentAmount: parseFloat(form.investmentAmount)
                });
                Alert.alert('Success', 'Client created successfully');
            }
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Creation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Add New User</Text>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Role Toggle */}
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, !isMediator && styles.toggleActive]}
                            onPress={() => setIsMediator(false)}
                        >
                            <Text style={[styles.toggleText, !isMediator && styles.toggleTextActive]}>Client</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, isMediator && styles.toggleActive]}
                            onPress={() => setIsMediator(true)}
                        >
                            <Text style={[styles.toggleText, isMediator && styles.toggleTextActive]}>Mediator (Agent)</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionHeader}>Basic Information</Text>

                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="John Doe"
                        placeholderTextColor={theme.textSecondary}
                        value={form.name}
                        onChangeText={t => updateForm('name', t)}
                    />

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="john@example.com"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={form.email}
                        onChangeText={t => updateForm('email', t)}
                    />

                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="+1 234 567 890"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="phone-pad"
                        value={form.mobile}
                        onChangeText={t => updateForm('mobile', t)}
                    />

                    <Text style={styles.label}>Password (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Leave empty for default"
                        placeholderTextColor={theme.textSecondary}
                        secureTextEntry
                        value={form.password}
                        onChangeText={t => updateForm('password', t)}
                    />

                    {!isMediator && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.sectionHeader}>Portfolio Setup</Text>

                            <Text style={styles.label}>Initial Investment Amount</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="numeric"
                                value={form.investmentAmount}
                                onChangeText={t => updateForm('investmentAmount', t)}
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Check size={20} color="#fff" />
                                <Text style={styles.submitText}>Create {isMediator ? 'Mediator' : 'Client'}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },

    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8, marginRight: 8 },
    pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },

    content: { padding: 20 },

    toggleContainer: { flexDirection: 'row', backgroundColor: theme.cardBg, borderRadius: 12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: theme.cardBorder },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    toggleActive: { backgroundColor: theme.primary },
    toggleText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
    toggleTextActive: { color: '#fff' },

    sectionHeader: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginBottom: 16, marginTop: 8 },

    label: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, marginBottom: 8 },
    input: { backgroundColor: theme.cardBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, color: theme.textPrimary, fontSize: 16, marginBottom: 16 },

    divider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 24 },

    submitBtn: { backgroundColor: theme.success, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24, shadowColor: theme.success, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
