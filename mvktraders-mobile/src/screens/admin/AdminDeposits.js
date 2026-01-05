import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, DollarSign, Check, X, Clock, CheckCircle, XCircle } from 'lucide-react-native';

export default function AdminDeposits({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);

    const loadRequests = async () => {
        try {
            const data = await adminService.getAllDepositRequests();
            setRequests(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load deposit requests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleAction = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setNote('');
        setModalVisible(true);
    };

    const confirmAction = async () => {
        if (!selectedRequest) return;

        setProcessing(true);
        try {
            if (actionType === 'approve') {
                await adminService.approveDepositRequest(selectedRequest.id, note);
                Alert.alert('Success', 'Deposit request approved');
            } else {
                if (!note.trim()) {
                    Alert.alert('Error', 'Please provide a rejection reason');
                    setProcessing(false);
                    return;
                }
                await adminService.rejectDepositRequest(selectedRequest.id, note);
                Alert.alert('Success', 'Deposit request rejected');
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
        const isApproved = item.status === 'APPROVED';
        const isRejected = item.status === 'REJECTED';

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.userName}>{item.userName || 'Unknown User'}</Text>
                        <Text style={styles.userEmail}>{item.userEmail || 'No Email'}</Text>
                        {item.userIdString && <Text style={styles.userEmail}>ID: {item.userIdString}</Text>}
                    </View>
                    <View style={[styles.statusBadge, {
                        backgroundColor: isPending ? theme.warningBg : isApproved ? theme.successBg : theme.errorBg
                    }]}>
                        <Text style={[styles.statusText, {
                            color: isPending ? theme.warning : isApproved ? theme.success : theme.error
                        }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>

                <View style={styles.amountRow}>
                    <DollarSign size={20} color={theme.success} />
                    <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
                </View>

                {item.userNote && (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>Note:</Text>
                        <Text style={styles.noteText}>{item.userNote}</Text>
                    </View>
                )}

                {item.adminNote && (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>Admin Note:</Text>
                        <Text style={styles.noteText}>{item.adminNote}</Text>
                    </View>
                )}

                <Text style={styles.dateText}>
                    Requested: {new Date(item.createdAt).toLocaleString()}
                </Text>

                {isPending && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleAction(item, 'approve')}
                        >
                            <Check size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleAction(item, 'reject')}
                        >
                            <X size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>
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
                <Text style={styles.pageTitle}>Deposit Requests</Text>
                <View style={{ width: 40 }} />
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
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} tintColor={theme.primary} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No deposit requests found</Text>
                        </View>
                    }
                />
            )}

            {/* Action Modal */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {actionType === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            Amount: {formatCurrency(selectedRequest?.amount || 0)}
                        </Text>

                        <Text style={styles.label}>
                            {actionType === 'approve' ? 'Note (Optional)' : 'Rejection Reason *'}
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder={actionType === 'approve' ? 'Add a note...' : 'Reason for rejection'}
                            placeholderTextColor={theme.textSecondary}
                            value={note}
                            onChangeText={setNote}
                            multiline
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, actionType === 'approve' ? styles.confirmApproveBtn : styles.confirmRejectBtn, processing && { opacity: 0.7 }]}
                                onPress={confirmAction}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>
                                        {actionType === 'approve' ? 'Approve' : 'Reject'}
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

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8 },
    pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },

    list: { padding: 16 },
    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.cardBorder },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    userName: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    userEmail: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '700' },

    amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    amount: { fontSize: 24, fontWeight: '700', color: theme.success },

    noteBox: { backgroundColor: theme.background, padding: 10, borderRadius: 8, marginBottom: 8 },
    noteLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 4 },
    noteText: { fontSize: 13, color: theme.textPrimary },

    dateText: { fontSize: 11, color: theme.textSecondary, marginTop: 4 },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 6 },
    approveBtn: { backgroundColor: theme.success },
    rejectBtn: { backgroundColor: theme.error },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: theme.cardBg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
    modalSubtitle: { fontSize: 16, color: theme.textSecondary, marginBottom: 20 },

    label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 8 },
    input: { backgroundColor: theme.background, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, color: theme.textPrimary, fontSize: 16, marginBottom: 20, minHeight: 80, textAlignVertical: 'top' },

    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    cancelBtn: { backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder },
    cancelBtnText: { color: theme.textPrimary, fontWeight: '700', fontSize: 14 },
    confirmApproveBtn: { backgroundColor: theme.success },
    confirmRejectBtn: { backgroundColor: theme.error },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 }
});
