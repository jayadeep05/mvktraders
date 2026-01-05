import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Wallet, TrendingUp, History, UserCheck, Shield, Send, Image as ImageIcon, X, Trash, Lock, Plus, ArrowDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

export default function AdminClientDetails({ route, navigation }) {
    const { clientId, clientName } = route.params;
    const { login } = useAuth(); // For impersonation
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [portfolio, setPortfolio] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Payout Modal
    const [payoutVisible, setPayoutVisible] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutDate, setPayoutDate] = useState('');
    const [payoutImage, setPayoutImage] = useState(null);
    const [payoutLoading, setPayoutLoading] = useState(false);

    // Fund Management Modal (Add Funds / Withdraw)
    const [fundModalVisible, setFundModalVisible] = useState(false);
    const [fundType, setFundType] = useState('DEPOSIT'); // DEPOSIT or WITHDRAWAL
    const [fundAmount, setFundAmount] = useState('');
    const [fundNote, setFundNote] = useState('');
    const [fundLoading, setFundLoading] = useState(false);

    const loadData = async () => {
        try {
            const [portRes, transRes] = await Promise.all([
                adminService.getClientPortfolio(clientId),
                adminService.getClientTransactions(clientId)
            ]);
            setPortfolio(portRes);
            setTransactions(transRes);
        } catch (error) {
            Alert.alert('Error', 'Failed to load client details');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleImpersonate = async () => {
        Alert.alert(
            'Impersonate User',
            `You are about to log in as ${clientName}. You will need to logout and login again to return to Admin.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    style: 'default',
                    onPress: async () => {
                        try {
                            const res = await adminService.impersonateUser(clientId);
                            await login(res.access_token, res.refresh_token, res.user);
                        } catch (e) {
                            Alert.alert('Error', 'Impersonation failed');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = async () => {
        Alert.alert(
            'Delete User',
            'This action is irreversible. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminService.deleteUser(clientId);
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setPayoutImage(result.assets[0]);
        }
    };

    const handlePayoutSubmit = async () => {
        if (!payoutAmount || !payoutImage) {
            Alert.alert('Error', 'Please provide amount and screenshot');
            return;
        }

        setPayoutLoading(true);
        try {
            const formData = new FormData();
            formData.append('userId', clientId);
            formData.append('amount', payoutAmount);
            formData.append('message', `Payout for ${payoutDate || new Date().toLocaleDateString()}`);

            // Append file
            const uri = Platform.OS === 'android' ? payoutImage.uri : payoutImage.uri.replace('file://', '');
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('screenshot', { uri, name: filename, type });

            await adminService.createPayout(formData);
            Alert.alert('Success', 'Payout recorded successfully');
            setPayoutVisible(false);
            setPayoutAmount('');
            setPayoutImage(null);
            loadData(); // Refresh
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Payout failed');
        } finally {
            setPayoutLoading(false);
        }
    };

    const handleFundSubmit = async () => {
        if (!fundAmount) {
            Alert.alert('Error', 'Please provide an amount');
            return;
        }

        setFundLoading(true);
        try {
            await adminService.createManualTransaction(clientId, {
                amount: parseFloat(fundAmount),
                type: fundType,
                note: fundNote
            });
            Alert.alert('Success', `${fundType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} successful`);
            setFundModalVisible(false);
            setFundAmount('');
            setFundNote('');
            loadData();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Transaction failed');
        } finally {
            setFundLoading(false);
        }
    };

    const openFundModal = (type) => {
        setFundType(type);
        setFundModalVisible(true);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{clientName}</Text>
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                    <Trash size={20} color={theme.error} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={theme.primary} />}
            >
                {/* Stats */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Portfolio Summary</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Invested</Text>
                            <Text style={styles.statValue}>{formatCurrency(portfolio?.totalInvested || 0)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Current Value</Text>
                            <Text style={styles.statValue}>{formatCurrency(portfolio?.totalValue || 0)}</Text>
                        </View>
                    </View>
                    <View style={[styles.statsRow, { marginTop: 15 }]}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Profit (Avail)</Text>
                            <Text style={[styles.statValue, { color: theme.success }]}>{formatCurrency(portfolio?.availableProfit || 0)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Profit %</Text>
                            <Text style={[styles.statValue, { color: theme.success }]}>{portfolio?.profitPercentage || 0}%</Text>
                        </View>
                    </View>

                    {/* Inline Fund Actions in Card */}
                    <View style={styles.inlineActionRow}>
                        <TouchableOpacity style={[styles.inlineBtn, { backgroundColor: theme.success + '20' }]} onPress={() => openFundModal('DEPOSIT')}>
                            <Plus size={16} color={theme.success} />
                            <Text style={[styles.inlineBtnText, { color: theme.success }]}>Add Funds</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.inlineBtn, { backgroundColor: theme.error + '20' }]} onPress={() => openFundModal('WITHDRAWAL')}>
                            <ArrowDown size={16} color={theme.error} />
                            <Text style={[styles.inlineBtnText, { color: theme.error }]}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => setPayoutVisible(true)}>
                        <Send size={20} color="#fff" />
                        <Text style={styles.primaryBtnText}>Record Payout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn} onPress={handleImpersonate}>
                        <UserCheck size={20} color={theme.primary} />
                        <Text style={styles.secondaryBtnText}>Impersonate</Text>
                    </TouchableOpacity>
                </View>

                {/* Transactions */}
                <Text style={styles.sectionTitle}>Transaction History</Text>
                {transactions.length === 0 ? (
                    <Text style={styles.emptyText}>No transactions found.</Text>
                ) : (
                    transactions.map((t) => (
                        <View key={t.id} style={styles.transItem}>
                            <View style={[styles.transIcon, {
                                backgroundColor: t.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' :
                                    t.type === 'WITHDRAWAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'
                            }]}>
                                {t.type === 'DEPOSIT' ? <Plus size={20} color={theme.success} /> :
                                    t.type === 'WITHDRAWAL' ? <ArrowDown size={20} color={theme.error} /> :
                                        t.type === 'PAYOUT' ? <Send size={20} color={theme.success} /> :
                                            <TrendingUp size={20} color={theme.primary} />}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.transType}>{t.type}</Text>
                                <Text style={styles.transDate}>{new Date(t.createdAt).toLocaleDateString()}</Text>
                                <Text style={styles.transMsg} numberOfLines={1}>{t.description || t.messageContent}</Text>
                            </View>
                            <Text style={[styles.transAmount, {
                                color: t.type === 'DEPOSIT' || t.type === 'PAYOUT' ? theme.success : theme.textPrimary
                            }]}>
                                {t.type === 'WITHDRAWAL' ? '-' : '+'}{formatCurrency(t.amount)}
                            </Text>
                        </View>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Payout Modal */}
            <Modal visible={payoutVisible} transparent animationType="slide" onRequestClose={() => setPayoutVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Record Profit Payout</Text>
                            <TouchableOpacity onPress={() => setPayoutVisible(false)}>
                                <X size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.label}>Amount</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="numeric"
                                value={payoutAmount}
                                onChangeText={setPayoutAmount}
                            />

                            <Text style={styles.label}>Date / Note (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Oct 2024 Profit"
                                placeholderTextColor={theme.textSecondary}
                                value={payoutDate}
                                onChangeText={setPayoutDate}
                            />

                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                {payoutImage ? (
                                    <Image source={{ uri: payoutImage.uri }} style={styles.previewImage} resizeMode="cover" />
                                ) : (
                                    <View style={styles.imagePlaceholder}>
                                        <ImageIcon size={32} color={theme.textSecondary} />
                                        <Text style={styles.imageText}>Upload Screenshot</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.submitBtn, payoutLoading && { opacity: 0.7 }]}
                                onPress={handlePayoutSubmit}
                                disabled={payoutLoading}
                            >
                                {payoutLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Confirm Payout</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Fund Modal (Add/Withdraw) */}
            <Modal visible={fundModalVisible} transparent animationType="fade" onRequestClose={() => setFundModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{fundType === 'DEPOSIT' ? 'Add Funds to User' : 'Withdraw Funds from User'}</Text>
                            <TouchableOpacity onPress={() => setFundModalVisible(false)}>
                                <X size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={[styles.modalSub, { color: fundType === 'DEPOSIT' ? theme.success : theme.error }]}>
                                {fundType === 'DEPOSIT' ? 'Increase Total Invested & Portfolio Value' : 'Decrease Available Profit (then Capital)'}
                            </Text>

                            <Text style={styles.label}>Amount</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor={theme.textSecondary}
                                keyboardType="numeric"
                                value={fundAmount}
                                onChangeText={setFundAmount}
                            />

                            <Text style={styles.label}>Note (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Reason for adjustment"
                                placeholderTextColor={theme.textSecondary}
                                value={fundNote}
                                onChangeText={setFundNote}
                            />

                            <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: fundType === 'DEPOSIT' ? theme.success : theme.error }, fundLoading && { opacity: 0.7 }]}
                                onPress={handleFundSubmit}
                                disabled={fundLoading}
                            >
                                {fundLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{fundType === 'DEPOSIT' ? 'Add Funds' : 'Withdraw Funds'}</Text>}
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8 },
    pageTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
    deleteBtn: { padding: 8 },

    scrollContent: { padding: 20 },

    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: theme.cardBorder },
    cardTitle: { fontSize: 14, fontWeight: '700', color: theme.textSecondary, marginBottom: 16, textTransform: 'uppercase' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    inlineActionRow: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.cardBorder + '80', gap: 10 },
    inlineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, gap: 6 },
    inlineBtnText: { fontWeight: '700', fontSize: 13 },

    statItem: { flex: 1 },
    statLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },

    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    primaryBtn: { flex: 1, flexDirection: 'row', backgroundColor: theme.primary, padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    secondaryBtn: { flex: 1, flexDirection: 'row', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.primary, padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
    secondaryBtnText: { color: theme.primary, fontWeight: '700', fontSize: 14 },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 12 },
    emptyText: { color: theme.textSecondary, fontStyle: 'italic' },
    transItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.cardBorder },
    transIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    transType: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    transDate: { fontSize: 11, color: theme.textSecondary },
    transMsg: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
    transAmount: { fontSize: 14, fontWeight: '700' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: theme.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    modalTitle: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
    modalSub: { fontSize: 13, fontWeight: '600', marginBottom: 15 },
    modalBody: { padding: 20 },

    label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 8, marginTop: 12 },
    input: { backgroundColor: theme.background, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, color: theme.textPrimary, fontSize: 16 },

    imagePicker: { height: 150, backgroundColor: theme.background, marginTop: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    imagePlaceholder: { alignItems: 'center', gap: 8 },
    imageText: { color: theme.textSecondary, fontWeight: '500' },
    previewImage: { width: '100%', height: '100%' },

    submitBtn: { backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
