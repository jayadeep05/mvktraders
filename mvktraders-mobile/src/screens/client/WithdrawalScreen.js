import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, CheckCircle, Wallet, TrendingUp, DollarSign, CalendarCheck, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { withdrawalService } from '../../api/client';
import { usePortfolio } from '../../context/PortfolioContext';

export default function WithdrawalScreen({ navigation, route }) {
    const { theme, isDark } = useTheme();
    const { portfolio: contextPortfolio, refreshPortfolio } = usePortfolio();
    const portfolio = route?.params?.portfolioData || contextPortfolio;
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Portfolio calculations
    const totalInvested = portfolio?.totalInvested || 0;
    const availableProfit = portfolio?.availableProfit || 0;
    const totalBalance = totalInvested + availableProfit;
    const currentNextMonthProfit = totalInvested * 0.04;

    const amountNum = parseFloat(amount) || 0;
    const isValidAmount = amountNum > 0 && amountNum <= totalBalance;

    // Deduction Priority: Profit First
    const deductFromProfit = Math.min(amountNum, availableProfit);
    const deductFromCapital = Math.max(0, amountNum - availableProfit);

    // Future State Calculations
    const newProfit = Math.max(0, availableProfit - deductFromProfit);
    const newInvested = Math.max(0, totalInvested - deductFromCapital);
    const newTotalBalance = newInvested + newProfit;
    const newNextMonthProfit = newInvested * 0.04;

    const isCapitalImpacted = deductFromCapital > 0;

    const handleReview = () => {
        if (!isValidAmount) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount within your available balance.');
            return;
        }
        if (amountNum > totalBalance) {
            Alert.alert('Insufficient Balance', 'Amount exceeds your available balance.');
            return;
        }
        setShowConfirmation(true);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await withdrawalService.createRequest(amountNum);
            setShowConfirmation(false);
            setSuccess(true);
            refreshPortfolio();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit withdrawal request');
        } finally {
            setLoading(false);
        }
    };

    // Info Card Component
    const InfoCard = ({ label, current, projected, icon: Icon, highlightColor }) => {
        const hasChanged = Math.abs(current - projected) > 0.1 && amountNum > 0;
        const isOverBalance = amountNum > totalBalance;
        const activeColor = isOverBalance ? '#ef4444' : highlightColor;

        return (
            <View style={[
                styles.infoCard,
                hasChanged && { borderColor: activeColor + '40', shadowColor: activeColor },
                isOverBalance && { borderColor: 'rgba(239, 68, 68, 0.5)' }
            ]}>
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
                            <Text style={[styles.newValue, { color: activeColor }]}>
                                ₹{Math.round(projected).toLocaleString('en-IN')}
                            </Text>
                        </View>
                    ) : (
                        <Text style={[styles.staticValue, amountNum > 0 && { color: activeColor }]}>
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
                    <CheckCircle size={80} color={theme.error} />
                    <Text style={styles.successTitle}>Request Submitted!</Text>
                    <Text style={styles.successText}>
                        Your withdrawal request for ₹{amount} has been submitted successfully and will be processed shortly.
                    </Text>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.goBack()}>
                        <LinearGradient colors={[theme.error, theme.error + 'DD']} style={styles.buttonGradient}>
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
                        <Text style={styles.headerTitle}>Withdraw Funds</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Centered Massive Amount Input Section */}
                    <View style={styles.centeredAmountSection}>
                        <Text style={styles.amountLabel}>WITHDRAWAL AMOUNT</Text>
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
                            <TouchableOpacity
                                style={styles.maxBadge}
                                onPress={() => setAmount(totalBalance.toString())}
                            >
                                <Text style={styles.maxBadgeText}>MAX</Text>
                            </TouchableOpacity>
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


                        {/* Disclaimer Message */}
                        {amountNum > 0 && (
                            <View style={[
                                styles.disclaimer,
                                isCapitalImpacted
                                    ? { backgroundColor: theme.error + '08', borderColor: theme.error + '20' }
                                    : { backgroundColor: theme.success + '08', borderColor: theme.success + '20' }
                            ]}>
                                <View style={[
                                    styles.disclaimerIcon,
                                    { backgroundColor: isCapitalImpacted ? theme.error + '15' : theme.success + '15' }
                                ]}>
                                    {isCapitalImpacted ? (
                                        <TrendingUp size={14} color={theme.error} style={{ transform: [{ rotate: '180deg' }] }} />
                                    ) : (
                                        <ShieldCheck size={14} color={theme.success} />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[
                                        styles.disclaimerTitle,
                                        { color: isCapitalImpacted ? theme.error : theme.success }
                                    ]}>
                                        {isCapitalImpacted ? "Capital Impact" : "Safe Withdrawal"}
                                    </Text>
                                    <Text style={styles.disclaimerText}>
                                        {isCapitalImpacted
                                            ? "Request exceeds profit. Reducing next month's return."
                                            : "Withdrawing from profit only. Capital remains intact."}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Impact Preview Section */}
                    <Text style={styles.sectionTitle}>PORTFOLIO IMPACT</Text>
                    <View style={styles.impactGrid}>
                        <InfoCard
                            label="Profit Balance"
                            icon={DollarSign}
                            current={availableProfit}
                            projected={newProfit}
                            highlightColor={amountNum > availableProfit ? theme.error : "#fbbf24"}
                        />
                        <InfoCard
                            label="Capital Assets"
                            icon={Wallet}
                            current={totalInvested}
                            projected={newInvested}
                            highlightColor={isCapitalImpacted ? theme.error : theme.success}
                        />
                        <InfoCard
                            label="Total Balance"
                            icon={TrendingUp}
                            current={totalBalance}
                            projected={newTotalBalance}
                            highlightColor="#94a3b8"
                        />
                        <InfoCard
                            label="Future Profit"
                            icon={CalendarCheck}
                            current={currentNextMonthProfit}
                            projected={newNextMonthProfit}
                            highlightColor={isCapitalImpacted ? theme.error : theme.success}
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[styles.mainSubmitBtn, !isValidAmount && { opacity: 0.5 }]}
                        onPress={handleReview}
                        disabled={!isValidAmount}
                    >
                        <LinearGradient
                            colors={isValidAmount ? [theme.error, theme.error + 'CC'] : [theme.cardBorder, theme.cardBorder]}
                            style={styles.submitGradient}
                        >
                            <TrendingUp size={20} color="#fff" style={{ transform: [{ rotate: '180deg' }] }} />
                            <Text style={styles.submitText}>Review Withdrawal</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Confirmation Modal */}
            <Modal visible={showConfirmation} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[
                            styles.modalIconContainer,
                            { backgroundColor: isCapitalImpacted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)' }
                        ]}>
                            {isCapitalImpacted ? (
                                <AlertTriangle size={32} color="#ef4444" />
                            ) : (
                                <CheckCircle size={32} color="#6366f1" />
                            )}
                        </View>
                        <Text style={styles.modalTitle}>
                            {isCapitalImpacted ? 'Capital Reduction Warning' : 'Confirm Withdrawal'}
                        </Text>
                        <Text style={styles.modalText}>
                            {isCapitalImpacted ? (
                                <>
                                    You are about to withdraw <Text style={styles.modalHighlight}>₹{amountNum.toLocaleString('en-IN')}</Text>.
                                    {'\n\n'}This will reduce your invested capital. Consequently, your estimated profit for next month will decrease to <Text style={[styles.modalHighlight, { color: '#ef4444' }]}>₹{Math.round(newNextMonthProfit).toLocaleString('en-IN')}</Text>.
                                </>
                            ) : (
                                <>
                                    You are about to withdraw <Text style={styles.modalHighlight}>₹{amountNum.toLocaleString('en-IN')}</Text> from your available profit.
                                    {'\n\n'}Your capital investment and future monthly returns will remain fully intact.
                                </>
                            )}
                        </Text>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setShowConfirmation(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: isCapitalImpacted ? '#ef4444' : '#6366f1' }]}
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10, backgroundColor: theme.background },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    backButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder },

    content: { paddingHorizontal: 20, paddingVertical: 12 },
    sectionTitle: { fontSize: 10, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1.2, marginBottom: 12, textTransform: 'uppercase' },

    // Centered Amount Section
    centeredAmountSection: { alignItems: 'center', marginBottom: 20, paddingTop: 4 },
    amountLabel: { fontSize: 10, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
    massiveInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    massiveCurrencySymbol: { fontSize: 32, fontWeight: '800', color: theme.textPrimary, marginRight: 6 },
    massiveAmountInput: { fontSize: 44, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', minWidth: 100 },
    maxBadge: { position: 'absolute', right: -45, backgroundColor: theme.primary + '15', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: theme.primary + '20' },
    maxBadgeText: { fontSize: 9, fontWeight: '800', color: theme.primary },

    chipsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginTop: 16, paddingBottom: 6 },
    quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder },
    quickChipActive: { backgroundColor: theme.primary + '15', borderColor: theme.primary },
    quickChipText: { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
    quickChipTextActive: { color: theme.primary },

    // Disclaimer
    disclaimer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, marginTop: 16, width: '100%' },
    disclaimerIcon: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    disclaimerTitle: { fontSize: 12, fontWeight: '700', marginBottom: 1 },
    disclaimerText: { color: theme.textSecondary, fontSize: 10, fontWeight: '500', lineHeight: 14 },

    // Impact Grid
    impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    infoCard: { width: '48%', backgroundColor: theme.cardBg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    iconContainer: { width: 24, height: 24, borderRadius: 6, backgroundColor: theme.primary + '10', alignItems: 'center', justifyContent: 'center' },
    infoCardLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary },
    infoCardValue: { marginTop: 1 },
    oldValue: { fontSize: 11, color: theme.textSecondary, textDecorationLine: 'line-through', marginBottom: 1 },
    newValue: { fontSize: 18, fontWeight: '800' },
    staticValue: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginTop: 10 },

    // Submit Button
    mainSubmitBtn: { height: 56, borderRadius: 16, overflow: 'hidden', shadowColor: theme.error, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },


    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: theme.cardBg, borderRadius: 32, padding: 32, width: '100%', maxWidth: 400, alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder },
    modalIconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 12, textAlign: 'center' },
    modalText: { color: theme.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
    modalHighlight: { color: theme.textPrimary, fontWeight: '800' },
    modalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
    modalButton: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    modalButtonCancel: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder },
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

