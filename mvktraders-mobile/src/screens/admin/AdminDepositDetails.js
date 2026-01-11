import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Check, X, Calendar, User, CreditCard, Hash, FileText } from 'lucide-react-native';

export default function AdminDepositDetails({ route, navigation }) {
    const { request } = route.params;
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [modalVisible, setModalVisible] = useState(false);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);

    const isPending = request.status === 'PENDING';
    const isApproved = request.status === 'APPROVED';
    const isRejected = request.status === 'REJECTED';

    const handleAction = (action) => {
        setActionType(action);
        setNote('');
        setModalVisible(true);
    };

    const confirmAction = async () => {
        setProcessing(true);
        try {
            if (actionType === 'approve') {
                await adminService.approveDepositRequest(request.id, note);
                Alert.alert('Success', 'Deposit request approved', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            } else {
                if (!note.trim()) {
                    Alert.alert('Error', 'Please provide a rejection reason');
                    setProcessing(false);
                    return;
                }
                await adminService.rejectDepositRequest(request.id, note);
                Alert.alert('Success', 'Deposit request rejected', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
            setModalVisible(false);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Action failed');
        } finally {
            setProcessing(false);
        }
    };

    const DetailItem = ({ icon: Icon, label, value, highlight }) => (
        <View style={styles.detailRow}>
            <View style={styles.iconBox}>
                <Icon size={20} color={theme.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, highlight && { color: theme.primary, fontWeight: '700' }]}>
                    {value || 'N/A'}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Request Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Card */}
                <View style={[styles.statusCard,
                isApproved ? { backgroundColor: theme.successBg, borderColor: theme.success } :
                    isRejected ? { backgroundColor: theme.errorBg, borderColor: theme.error } :
                        { backgroundColor: theme.warningBg, borderColor: theme.warning }
                ]}>
                    <Text style={[styles.statusTitle,
                    isApproved ? { color: theme.success } :
                        isRejected ? { color: theme.error } :
                            { color: theme.warning }
                    ]}>
                        {request.status}
                    </Text>
                    <Text style={[styles.statusDesc, { color: theme.textSecondary }]}>
                        {isApproved ? 'This request has been approved and processed.' :
                            isRejected ? 'This request was rejected.' :
                                'Action is required for this request.'}
                    </Text>
                </View>

                {/* Main Details Card */}
                <View style={styles.card}>
                    <DetailItem
                        icon={User}
                        label="User ID"
                        value={request.userIdString}
                    />
                    <View style={styles.divider} />
                    <DetailItem
                        icon={CreditCard}
                        label="Deposit Amount"
                        value={formatCurrency(request.amount)}
                        highlight
                    />
                    <View style={styles.divider} />
                    <DetailItem
                        icon={Calendar}
                        label="Request Date & Time"
                        value={new Date(request.createdAt).toLocaleString()}
                    />
                    <View style={styles.divider} />
                    <DetailItem
                        icon={Hash}
                        label="Transaction ID / Reference"
                        value={request.paymentReference || 'Not provided'}
                    />
                    {request.userNote && (
                        <>
                            <View style={styles.divider} />
                            <DetailItem
                                icon={FileText}
                                label="User Note"
                                value={request.userNote}
                            />
                        </>
                    )}
                </View>

                {/* Action Buttons for Pending Requests */}
                {isPending && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => handleAction('reject')}
                        >
                            <X size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleAction('approve')}
                        >
                            <Check size={20} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {/* Confirmation Modal */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {actionType === 'approve' ? 'Approve Deposit' : 'Reject Deposit'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            Are you sure you want to {actionType} this request of {formatCurrency(request.amount)}?
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
                                style={[styles.modalBtn, actionType === 'approve' ? styles.confirmApproveBtn : styles.confirmRejectBtn]}
                                onPress={confirmAction}
                                disabled={processing}
                            >
                                {processing ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>
                                        {actionType === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
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
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 4 },
    pageTitle: { fontSize: 18, fontWeight: '600', color: theme.textPrimary },

    content: { padding: 16 },

    statusCard: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    statusTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
    statusDesc: { fontSize: 14 },

    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 20 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 13, color: theme.textSecondary, marginBottom: 4 },
    detailValue: { fontSize: 16, color: theme.textPrimary },
    divider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 16, marginLeft: 52 },

    actionsContainer: { flexDirection: 'row', gap: 16, marginTop: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
    approveBtn: { backgroundColor: theme.success },
    rejectBtn: { backgroundColor: theme.error },
    actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: theme.cardBg, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: theme.textSecondary, marginBottom: 20 },
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
