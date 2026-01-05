import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, ArrowDownLeft, X, Check, AlertTriangle, CreditCard, Banknote } from 'lucide-react-native';

export default function AdminWithdrawals({ navigation }) {
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [actionType, setActionType] = useState(null); // 'APPROVE' or 'REJECT'
    const [selectedItem, setSelectedItem] = useState(null);
    const [inputValue, setInputValue] = useState(''); // Payment Mode or Reject Reason

    const loadRequests = async () => {
        try {
            const data = await adminService.getAllWithdrawalRequests();
            // Sort by pending first, then date
            const sorted = data.sort((a, b) => {
                if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
                if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
            setRequests(sorted);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const openActionModal = (item, type) => {
        setSelectedItem(item);
        setActionType(type);
        setInputValue(type === 'APPROVE' ? 'Bank Transfer' : '');
        setModalVisible(true);
    };

    const confirmAction = async () => {
        if (!selectedItem) return;
        setProcessing(true);
        try {
            if (actionType === 'APPROVE') {
                await adminService.approveWithdrawalRequest(selectedItem.id, inputValue || 'Bank Transfer');
                Alert.alert('Success', 'Withdrawal Approved');
            } else {
                if (!inputValue.trim()) {
                    Alert.alert('Error', 'Please provide a reason for rejection');
                    setProcessing(false);
                    return;
                }
                await adminService.rejectWithdrawalRequest(selectedItem.id, inputValue);
                Alert.alert('Rejected', 'Withdrawal request rejected');
            }
            setModalVisible(false);
            loadRequests();
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Action failed');
        } finally {
            setProcessing(false);
        }
    };

    const renderItem = ({ item }) => {
        const isPending = item.status === 'PENDING';
        return (
            <View style={[styles.card, { opacity: isPending ? 1 : 0.7 }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.iconBox}>
                        <ArrowDownLeft size={20} color={isDark ? '#fff' : theme.error} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                        <Text style={styles.user}>Client ID: {item.userId}</Text>
                        <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                    <View style={[styles.statusBadge, {
                        backgroundColor: item.status === 'PENDING' ? theme.warningBg :
                            item.status === 'APPROVED' ? theme.successBg : theme.errorBg
                    }]}>
                        <Text style={[styles.statusText, {
                            color: item.status === 'PENDING' ? theme.warning :
                                item.status === 'APPROVED' ? theme.success : theme.error
                        }]}>{item.status}</Text>
                    </View>
                </View>

                {isPending && (
                    <View style={styles.actions}>
                        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => openActionModal(item, 'REJECT')}>
                            <Text style={[styles.btnText, { color: theme.error }]}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => openActionModal(item, 'APPROVE')}>
                            <Text style={[styles.btnText, { color: '#fff' }]}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!isPending && item.adminComment && (
                    <View style={styles.commentBox}>
                        <Text style={styles.commentLabel}>Note:</Text>
                        <Text style={styles.commentText}>{item.adminComment}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Withdrawals</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRequests} tintColor={theme.primary} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No withdrawal requests</Text>
                        </View>
                    }
                />
            )}

            {/* Action Modal */}
            <Modal transparent visible={modalVisible} animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {actionType === 'APPROVE' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <Text style={styles.modalLabel}>
                                {actionType === 'APPROVE' ? 'Select Payment Mode' : 'Reason for Rejection'}
                            </Text>

                            {actionType === 'APPROVE' ? (
                                <View style={styles.paymentOptions}>
                                    {['Bank Transfer', 'Cash', 'USDT'].map(mode => (
                                        <TouchableOpacity
                                            key={mode}
                                            style={[styles.optionBtn, inputValue === mode && styles.optionBtnActive]}
                                            onPress={() => setInputValue(mode)}
                                        >
                                            <Text style={[styles.optionText, inputValue === mode && { color: '#fff' }]}>{mode}</Text>
                                            {inputValue === mode && <Check size={14} color="#fff" />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter reason..."
                                    placeholderTextColor={theme.textSecondary}
                                    value={inputValue}
                                    onChangeText={setInputValue}
                                    multiline
                                />
                            )}
                        </View>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, { backgroundColor: actionType === 'APPROVE' ? theme.success : theme.error }]}
                                onPress={confirmAction}
                                disabled={processing}
                            >
                                {processing ? <ActivityIndicator color="#fff" /> : (
                                    <Text style={styles.confirmText}>
                                        {actionType === 'APPROVE' ? 'Confirm Payment' : 'Reject Request'}
                                    </Text>
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
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8, marginRight: 8 },
    pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },

    list: { padding: 16 },
    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.cardBorder },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.errorBg, justifyContent: 'center', alignItems: 'center' },
    amount: { fontSize: 18, fontWeight: '700', color: theme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    user: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    date: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },

    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

    actions: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingTop: 12 },
    btn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.error },
    approveBtn: { backgroundColor: theme.success },
    btnText: { fontWeight: '600', fontSize: 13 },

    commentBox: { marginTop: 12, backgroundColor: theme.background, padding: 10, borderRadius: 8 },
    commentLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary },
    commentText: { fontSize: 13, color: theme.textPrimary, marginTop: 2 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: theme.modalBg, borderRadius: 20, overflow: 'hidden' },
    modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    modalTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    modalBody: { padding: 20 },
    modalLabel: { fontSize: 13, color: theme.textSecondary, marginBottom: 12, fontWeight: '600' },

    paymentOptions: { gap: 10 },
    optionBtn: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 12, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder },
    optionBtnActive: { backgroundColor: theme.success, borderColor: theme.success },
    optionText: { color: theme.textPrimary, fontWeight: '500' },

    input: { backgroundColor: theme.background, padding: 12, borderRadius: 12, color: theme.textPrimary, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.cardBorder },

    modalFooter: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder },
    cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
    cancelText: { color: theme.textSecondary, fontWeight: '600' },
    confirmBtn: { flex: 2, padding: 14, borderRadius: 12, alignItems: 'center' },
    confirmText: { color: '#fff', fontWeight: '700' }
});
