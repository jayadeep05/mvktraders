import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, CheckCircle, Wallet, TrendingUp } from 'lucide-react-native';
import { clientService } from '../../api/client';
import { usePortfolio } from '../../context/PortfolioContext';

export default function DepositScreen({ navigation, route }) {
    const { theme, isDark } = useTheme();
    const { portfolio: contextPortfolio, refreshPortfolio } = usePortfolio();
    const portfolio = route?.params?.portfolioData || contextPortfolio;
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Portfolio calculations
    const currentInvested = portfolio?.totalInvested || 0;
    const profitPercentage = (portfolio?.profitPercentage && portfolio.profitPercentage > 0) ? portfolio.profitPercentage : 4.0;
    const currentMonthlyProfit = currentInvested * (profitPercentage / 100);

    const amountNum = parseFloat(amount) || 0;
    const isValidAmount = !isNaN(amountNum) && amountNum > 0;

    const newInvested = currentInvested + amountNum;
    const nextMonthProfit = newInvested * (profitPercentage / 100);

    const handleReview = () => {
        if (!isValidAmount) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
            return;
        }
        setShowConfirmation(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Using the JSON endpoint since there's no screenshot
            await clientService.createDepositRequestJson({
                amount: amountNum,
                note: 'Client manual deposit'
            });
            setShowConfirmation(false);
            setSuccess(true);
            refreshPortfolio();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit deposit request');
        } finally {
            setLoading(false);
        }
    };

    // Info Card Component
    const InfoCard = ({ label, current, projected, icon: Icon, highlightColor }) => {
        const hasChanged = Math.abs(current - projected) > 0.1 && amountNum > 0;

        return (
            <View style={[styles.infoCard, hasChanged && { borderColor: highlightColor + '40', shadowColor: highlightColor }]}>
                <View style={styles.infoCardHeader}>
                    <View style={styles.iconContainer}>
                        <Icon size={16} color={theme.textSecondary} />
                    </View>
                    <Text style={styles.infoCardLabel}>{label}</Text>
                </View>
                <View style={styles.infoCardValue}>
                    {hasChanged ? (
                        <View>
                            <Text style={styles.oldValue}>₹{Math.round(current).toLocaleString('en-IN')}</Text>
                            <Text style={[styles.newValue, { color: highlightColor }]}>
                                ₹{Math.round(projected).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.staticValue, amountNum > 0 && { color: highlightColor }]}>
                            ₹{Math.round(current).toLocaleString('en-IN')}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    if (success) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContent}>
                    <CheckCircle size={80} color={theme.success} />
                    <Text style={styles.successTitle}>Request Submitted!</Text>
                    <Text style={styles.successText}>
                        Your deposit request for ₹{amount} has been submitted successfully and is pending admin approval.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
                        <LinearGradient colors={[theme.success, theme.success + 'DD']} style={styles.buttonGradient}>
                            <Text style={styles.buttonText}>Back to Dashboard</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Add Funds</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Centered Massive Amount Input Section */}
                    <View style={styles.centeredAmountSection}>
                        <Text style={styles.amountLabel}>INVESTMENT AMOUNT</Text>
                        <View style={styles.massiveInputWrapper}>
                            <Text style={styles.massiveCurrencySymbol}>₹</Text>
                            <TextInput
                                style={styles.massiveAmountInput}
                                placeholder="0"
                                placeholderTextColor={theme.textSecondary + '50'}
                                keyboardType="decimal-pad"
                                value={amount}
                                onChangeText={setAmount}
                                autoFocus
                            />
                        </View>

                        {/* Quick Amount Chips - Single Row */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chipsRow}
                        >
                            {[5000, 10000, 25000, 50000].map(val => (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.quickChip, parseFloat(amount) === val && styles.quickChipActive]}
                                    onPress={() => setAmount(val.toString())}
                                >
                                    <Text style={[styles.quickChipText, parseFloat(amount) === val && styles.quickChipTextActive]}>
                                        +₹{val.toLocaleString('en-IN')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Impact Preview Section */}
                    <Text style={styles.sectionTitle}>POTENTIAL IMPACT</Text>
                    <View style={styles.impactGrid}>
                        <InfoCard
                            label="Invested Capital"
                            icon={Wallet}
                            current={currentInvested}
                            projected={newInvested}
                            highlightColor="#4ade80"
                        />
                        <InfoCard
                            label="Monthly Return"
                            icon={TrendingUp}
                            current={currentMonthlyProfit}
                            projected={nextMonthProfit}
                            highlightColor="#3b82f6"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.mainSubmitBtn, !isValidAmount && { opacity: 0.5 }]}
                        onPress={handleReview}
                        disabled={!isValidAmount}
                    >
                        <LinearGradient
                            colors={isValidAmount ? [theme.primary, theme.primary + 'CC'] : [theme.cardBorder, theme.cardBorder]}
                            style={styles.submitGradient}
                        >
                            <CheckCircle size={20} color="#fff" />
                            <Text style={styles.submitText}>Review Deposit Request</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Confirmation Modal */}
            <Modal visible={showConfirmation} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIconContainer}>
                            <CheckCircle size={32} color="#3b82f6" />
                        </View>
                        <Text style={styles.modalTitle}>Confirm Deposit</Text>
                        <Text style={styles.modalText}>
                            Confirm deposit of <Text style={styles.modalHighlight}>₹{amountNum.toLocaleString('en-IN')}</Text>?
                            {'\n\n'}Your capital becomes <Text style={[styles.modalHighlight, { color: '#3b82f6' }]}>₹{newInvested.toLocaleString('en-IN')}</Text> with <Text style={[styles.modalHighlight, { color: '#4ade80' }]}>₹{Math.round(nextMonthProfit).toLocaleString('en-IN')}</Text> monthly profit.
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowConfirmation(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonConfirm]}
                                onPress={handleSubmit}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.background },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder },

    content: { paddingHorizontal: 24, paddingVertical: 16 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' },

    // Centered Amount Section
    centeredAmountSection: { alignItems: 'center', marginBottom: 32, paddingTop: 10 },
    amountLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 12 },
    massiveInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    massiveCurrencySymbol: { fontSize: 40, fontWeight: '800', color: theme.textPrimary, marginRight: 8 },
    massiveAmountInput: { fontSize: 56, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', minWidth: 120 },

    chipsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginTop: 24, paddingBottom: 8 },
    quickChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder },
    quickChipActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
    quickChipText: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },
    quickChipTextActive: { color: theme.primary },

    // Impact Grid
    impactGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    infoCard: { flex: 1, backgroundColor: theme.cardBg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    iconContainer: { width: 28, height: 28, borderRadius: 8, backgroundColor: theme.primary + '10', alignItems: 'center', justifyContent: 'center' },
    infoCardLabel: { fontSize: 12, fontWeight: '700', color: theme.textSecondary },
    infoCardValue: { marginTop: 2 },
    oldValue: { fontSize: 12, color: theme.textSecondary, textDecorationLine: 'line-through', marginBottom: 2 },
    newValue: { fontSize: 20, fontWeight: '800' },
    staticValue: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginTop: 14 },

    staticValue: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginTop: 14 },

    // Submit Button
    mainSubmitBtn: { height: 60, borderRadius: 18, overflow: 'hidden', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: theme.cardBg, borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder },
    modalIconContainer: { width: 64, height: 64, backgroundColor: theme.primary + '15', borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 12 },
    modalText: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
    modalHighlight: { color: theme.textPrimary, fontWeight: '800' },
    modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
    modalButton: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modalButtonCancel: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder },
    modalButtonConfirm: { backgroundColor: theme.primary },
    modalButtonTextCancel: { color: theme.textSecondary, fontWeight: '700' },
    modalButtonTextConfirm: { color: '#fff', fontWeight: '700' },

    // Success Screen
    successContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    successTitle: { fontSize: 28, fontWeight: '800', color: theme.textPrimary, marginTop: 24, marginBottom: 12 },
    successText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    primaryButton: { width: '100%', height: 60, borderRadius: 18, overflow: 'hidden' },
    buttonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});

