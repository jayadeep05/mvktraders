import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { clientService } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, Mail, Shield, KeyRound, LogOut, X, ChevronRight, Moon, Sun } from 'lucide-react-native';

export default function ProfileScreen({ navigation }) {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    // Change Password State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [passLoading, setPassLoading] = useState(false);

    // Fallback if 'user' object structure varies
    const name = user?.name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || user?.sub || '---';
    const role = user?.role || 'CLIENT';

    const handleChangePassword = async () => {
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        if (passwordData.new !== passwordData.confirm) {
            Alert.alert('Error', 'New passwords do not match');
            return;
        }
        if (passwordData.new.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setPassLoading(true);
        try {
            await clientService.updatePassword(passwordData.current, passwordData.new);
            Alert.alert('Success', 'Password updated successfully');
            setShowPasswordModal(false);
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to update password';
            Alert.alert('Error', msg);
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Profile</Text>
                <TouchableOpacity onPress={toggleTheme} style={styles.themeToggle}>
                    {isDark ? <Sun size={20} color={theme.warning} /> : <Moon size={20} color={theme.primary} />}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.name}>{name}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>{role}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Mail size={20} color={theme.primary} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.label}>Email Address</Text>
                            <Text style={styles.value}>{email}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Shield size={20} color={theme.success} />
                        </View>
                        <View style={styles.rowContent}>
                            <Text style={styles.label}>Account Status</Text>
                            <Text style={[styles.value, { color: theme.success }]}>Active & Verified</Text>
                        </View>
                    </View>
                </View>

                {/* Actions Section */}
                <View style={[styles.section, { marginTop: 24 }]}>
                    <TouchableOpacity style={styles.actionRow} onPress={() => setShowPasswordModal(true)}>
                        <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(79, 70, 229, 0.1)' }]}>
                            <KeyRound size={20} color={theme.primary} />
                        </View>
                        <Text style={styles.actionText}>Change Password</Text>
                        <ChevronRight size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.actionRow} onPress={logout}>
                        <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <LogOut size={20} color={theme.error} />
                        </View>
                        <Text style={[styles.actionText, { color: theme.error }]}>Sign Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        To update your email or personal details, please contact your account manager or support.
                    </Text>
                </View>

            </ScrollView>


            {/* Change Password Modal */}
            <Modal
                visible={showPasswordModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPasswordModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxWidth: 400 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>CHANGE PASSWORD</Text>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.closeBtn}>
                                <X size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 20 }}>
                            <Text style={styles.inputLabel}>Current Password</Text>
                            <TextInput
                                style={[styles.input, { marginBottom: 16 }]}
                                secureTextEntry
                                value={passwordData.current}
                                onChangeText={t => setPasswordData({ ...passwordData, current: t })}
                                placeholder="Enter current password"
                                placeholderTextColor={theme.textSecondary}
                            />

                            <Text style={styles.inputLabel}>New Password</Text>
                            <TextInput
                                style={[styles.input, { marginBottom: 16 }]}
                                secureTextEntry
                                value={passwordData.new}
                                onChangeText={t => setPasswordData({ ...passwordData, new: t })}
                                placeholder="Enter new password (min 6 chars)"
                                placeholderTextColor={theme.textSecondary}
                            />

                            <Text style={styles.inputLabel}>Confirm New Password</Text>
                            <TextInput
                                style={[styles.input, { marginBottom: 24 }]}
                                secureTextEntry
                                value={passwordData.confirm}
                                onChangeText={t => setPasswordData({ ...passwordData, confirm: t })}
                                placeholder="Confirm new password"
                                placeholderTextColor={theme.textSecondary}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                                onPress={handleChangePassword}
                                disabled={passLoading}
                            >
                                {passLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Update Password</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.headerText,
    },
    themeToggle: {
        padding: 8,
    },
    content: {
        padding: 24,
        alignItems: 'center',
    },
    avatarContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: theme.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.textPrimary,
        marginBottom: 8,
    },
    roleBadge: {
        backgroundColor: theme.mode === 'dark' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(147, 51, 234, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.secondary,
        opacity: 0.8
    },
    roleText: {
        color: theme.secondary,
        fontSize: 12,
        fontWeight: '600',
    },
    section: {
        width: '100%',
        backgroundColor: theme.cardBg, // using mapped value (cardData)
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: theme.cardBorder,
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    actionText: { flex: 1, color: theme.textPrimary, fontSize: 16, fontWeight: '500' },

    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.5)' : '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    rowContent: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: theme.textSecondary,
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: theme.textPrimary,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: theme.cardBorder,
        marginVertical: 16,
    },
    infoBox: {
        marginTop: 24,
        padding: 16,
        backgroundColor: theme.mode === 'dark' ? 'rgba(148, 163, 184, 0.05)' : '#f8fafc',
        borderRadius: 12,
    },
    infoText: {
        color: theme.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
    },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContent: { width: '100%', backgroundColor: theme.modalBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
    modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.modalBg },
    modalTitle: { color: theme.headerText, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    closeBtn: { padding: 6, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: 20 },

    inputLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 6, fontWeight: '500' },
    input: { backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.inputBorder, padding: 12, borderRadius: 10, color: theme.textPrimary, fontSize: 14, fontWeight: '500' },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
});
