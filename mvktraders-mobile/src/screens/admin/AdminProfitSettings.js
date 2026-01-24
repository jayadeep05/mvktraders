import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Alert,
    Platform,
    StatusBar,
    Switch,
    Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { ArrowLeft, Save, Clock, Percent, Calendar, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminProfitSettings({ navigation }) {
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Config State
    const [fixedRate, setFixedRate] = useState('');
    const [compoundingRate, setCompoundingRate] = useState('');
    const [durationValue, setDurationValue] = useState('');
    const [durationUnit, setDurationUnit] = useState('MONTHS');
    const [useProration, setUseProration] = useState(true);

    // Premium Action Modal State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [actionConfig, setActionConfig] = useState({
        title: '',
        message: '',
        icon: 'Info',
        type: 'info',
        confirmLabel: 'OK',
        onConfirm: () => { }
    });

    const triggerActionModal = (config) => {
        setActionConfig({
            title: config.title || 'Notification',
            message: config.message || '',
            icon: config.icon || 'Info',
            type: config.type || 'info',
            confirmLabel: config.confirmLabel || 'OK',
            onConfirm: config.onConfirm || (() => setActionModalVisible(false))
        });
        setActionModalVisible(true);
    };

    const loadConfigs = async () => {
        try {
            setLoading(true);
            const data = await adminService.getGlobalConfigs();
            setFixedRate(data['FIXED_MONTHLY_RATE_PERCENT']);
            setCompoundingRate(data['COMPOUNDING_MONTHLY_RATE_PERCENT']);
            setDurationValue(data['PROFIT_DURATION_VALUE']);
            setDurationUnit(data['PROFIT_DURATION_UNIT']);
            setUseProration(data['USE_FIRST_MONTH_PRORATION'] === 'true');
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load configurations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfigs();
    }, []);

    const handleSave = async () => {
        triggerActionModal({
            title: 'Verify Changes',
            message: 'Are you sure you want to update global profit parameters? This will define the default settings for future client registrations.',
            icon: 'Save',
            type: 'warning',
            confirmLabel: 'Confirm Update',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    setSaving(true);
                    const updates = {
                        'FIXED_MONTHLY_RATE_PERCENT': fixedRate,
                        'COMPOUNDING_MONTHLY_RATE_PERCENT': compoundingRate,
                        'PROFIT_DURATION_VALUE': durationValue,
                        'PROFIT_DURATION_UNIT': durationUnit,
                        'USE_FIRST_MONTH_PRORATION': String(useProration)
                    };
                    await adminService.updateGlobalConfigs(updates);

                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Settings Updated',
                            message: 'The global profit configuration has been synchronized successfully.',
                            icon: 'CheckCircle2',
                            type: 'success',
                            confirmLabel: 'Done',
                            onConfirm: () => setActionModalVisible(false)
                        });
                    }, 500);
                } catch (error) {
                    console.error(error);
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Update Failed',
                            message: 'An error occurred while saving configurations. Please verify your connection.',
                            icon: 'AlertTriangle',
                            type: 'error',
                            confirmLabel: 'Discard'
                        });
                    }, 500);
                } finally {
                    setSaving(false);
                }
            }
        });
    };

    const UnitButton = ({ unit, label }) => (
        <TouchableOpacity
            style={[styles.unitBtn, durationUnit === unit && styles.unitBtnActive]}
            onPress={() => setDurationUnit(unit)}
        >
            <Text style={[styles.unitBtnText, durationUnit === unit && styles.unitBtnTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profit Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Duration Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Clock size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>Profit Cycle Duration</Text>
                    </View>
                    <Text style={styles.cardDesc}>Define how often the profit calculation runs.</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Duration Value</Text>
                        <TextInput
                            style={styles.input}
                            value={String(durationValue)}
                            onChangeText={setDurationValue}
                            keyboardType="numeric"
                            placeholder="e.g. 1"
                            placeholderTextColor={theme.textSecondary}
                        />
                    </View>

                    <Text style={styles.label}>Duration Unit</Text>
                    <View style={styles.unitRow}>
                        <UnitButton unit="MINUTES" label="Minutes" />
                        <UnitButton unit="HOURS" label="Hours" />
                        <UnitButton unit="DAYS" label="Days" />
                        <UnitButton unit="MONTHS" label="Months" />
                    </View>
                </View>

                {/* Rates Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Percent size={20} color={theme.success} />
                        <Text style={styles.cardTitle}>Global Base Rates</Text>
                    </View>
                    <Text style={styles.cardDesc}>Default rates for new clients. Does not affect existing portfolios.</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Fixed Monthly Rate (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={String(fixedRate)}
                            onChangeText={setFixedRate}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Compounding Monthly Rate (%)</Text>
                        <TextInput
                            style={styles.input}
                            value={String(compoundingRate)}
                            onChangeText={setCompoundingRate}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* Other Configs */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Calendar size={20} color={theme.warning} />
                        <Text style={styles.cardTitle}>Proration Rules</Text>
                    </View>

                    <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.label, { marginBottom: 4 }]}>First Month Proration</Text>
                            <Text style={styles.subLabel}>Calculate partial profit for joining month/period</Text>
                        </View>
                        <Switch
                            value={useProration}
                            onValueChange={setUseProration}
                            trackColor={{ false: theme.cardBorder, true: theme.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#1e3a8a', '#1e40af']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.saveBtnGradient}
                    >
                        {saving ? <ActivityIndicator color="#fff" /> : (
                            <>
                                <Save size={20} color="#fff" />
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Custom Premium Action Modal */}
            <Modal
                transparent
                visible={actionModalVisible}
                animationType="fade"
                onRequestClose={() => setActionModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.actionCard}>
                        {/* Elite Icon Decoration */}
                        <View style={[
                            styles.iconContainer,
                            {
                                backgroundColor:
                                    actionConfig.type === 'success' ? '#10b98115' :
                                        actionConfig.type === 'warning' ? '#f59e0b15' :
                                            actionConfig.type === 'error' ? '#ef444415' : '#4f46e515'
                            }
                        ]}>
                            {actionConfig.icon === 'CheckCircle2' && <CheckCircle2 size={36} color="#10b981" />}
                            {actionConfig.icon === 'AlertTriangle' && <AlertTriangle size={36} color="#f59e0b" />}
                            {actionConfig.icon === 'Info' && <Info size={36} color="#4f46e5" />}
                            {actionConfig.icon === 'Save' && <Save size={36} color="#f59e0b" />}
                        </View>

                        <Text style={styles.actionTitle}>{actionConfig.title}</Text>
                        <Text style={styles.actionMessage}>{actionConfig.message}</Text>

                        <View style={styles.modalActionRow}>
                            {actionConfig.type === 'warning' && (
                                <TouchableOpacity
                                    style={styles.cancelBtn}
                                    onPress={() => setActionModalVisible(false)}
                                >
                                    <Text style={styles.cancelBtnText}>Dismiss</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.confirmBtn,
                                    {
                                        backgroundColor:
                                            actionConfig.type === 'success' ? '#10b981' :
                                                actionConfig.type === 'error' ? '#ef4444' :
                                                    actionConfig.type === 'warning' ? '#f59e0b' : '#4f46e5'
                                    }
                                ]}
                                onPress={actionConfig.onConfirm}
                            >
                                <LinearGradient
                                    colors={
                                        actionConfig.type === 'success' ? ['#10b981', '#059669'] :
                                            actionConfig.type === 'error' ? ['#ef4444', '#dc2626'] :
                                                actionConfig.type === 'warning' ? ['#f59e0b', '#d97706'] : ['#4f46e5', '#4338ca']
                                    }
                                    style={styles.confirmGradient}
                                >
                                    <Text style={styles.confirmBtnText}>{actionConfig.confirmLabel}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8, borderRadius: 20, backgroundColor: theme.cardBg },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
    content: { padding: 20, paddingBottom: 100 },

    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.cardBorder },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    cardDesc: { fontSize: 13, color: theme.textSecondary, marginBottom: 20, lineHeight: 18 },

    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 8 },
    input: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 12, color: theme.textPrimary, fontSize: 15, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

    unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    unitBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder, backgroundColor: theme.background },
    unitBtnActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    unitBtnText: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
    unitBtnTextActive: { color: '#fff' },

    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    subLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: theme.background, borderTopWidth: 1, borderTopColor: theme.cardBorder },
    saveBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#1e3a8a',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6
    },
    saveBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12
    },
    saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    actionCard: { width: '100%', maxWidth: 340, backgroundColor: theme.cardBg, borderRadius: 32, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, borderWidth: 1, borderColor: theme.cardBorder },
    iconContainer: { width: 72, height: 72, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    actionTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 8, textAlign: 'center' },
    actionMessage: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 30, opacity: 0.8 },
    modalActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
    cancelBtn: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder },
    cancelBtnText: { color: theme.textSecondary, fontWeight: '700', fontSize: 15 },
    confirmBtn: { flex: 2, height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    confirmGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }
});
