import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, Alert, Dimensions, Platform, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import {
    ArrowLeft, Search, X, Check, XCircle,
    Clock, Calendar, User, CreditCard,
    FileText, Hash, ChevronRight, AlertCircle,
    Copy, History, Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function AdminWithdrawals({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processing, setProcessing] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('All');
    const TABS = ['All', 'Pending', 'Approved', 'Rejected'];
    const pagerRef = useRef(null);
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectionInput, setShowRejectionInput] = useState(false);
    const [paymentMode, setPaymentMode] = useState('Bank Transfer');
    const [showApprovalInput, setShowApprovalInput] = useState(false);

    // Premium Action Modal State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [actionConfig, setActionConfig] = useState({
        title: '',
        message: '',
        icon: 'Info',
        type: 'info', // 'success', 'warning', 'error', 'info'
        confirmLabel: 'Proceed',
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

    const loadRequests = async () => {
        try {
            const data = await adminService.getAllWithdrawalRequests();
            const sorted = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setRequests(sorted);
        } catch (error) {
            console.error('Failed to load withdrawal requests', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRequests();
        }, [])
    );

    const handleApprove = async (id) => {
        setProcessing(true);
        try {
            await adminService.approveWithdrawalRequest(id, paymentMode);

            setTimeout(() => {
                triggerActionModal({
                    title: 'Withdrawal Processed',
                    message: `Funds have been successfully dispatched via ${paymentMode}.`,
                    icon: 'Check',
                    type: 'success',
                    confirmLabel: 'Done',
                    onConfirm: () => setActionModalVisible(false)
                });
            }, 500);

            setSelectedRequest(null);
            setShowApprovalInput(false);
            loadRequests();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to approve request';
            setTimeout(() => {
                triggerActionModal({
                    title: 'Sync Error',
                    message: errorMsg,
                    icon: 'X',
                    type: 'error',
                    confirmLabel: 'Close'
                });
            }, 500);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (id) => {
        if (!rejectionReason.trim()) {
            triggerActionModal({
                title: 'Context Required',
                message: 'Please provide a justification for declining this withdrawal.',
                icon: 'AlertCircle',
                type: 'warning',
                confirmLabel: 'I Will'
            });
            return;
        }
        setProcessing(true);
        try {
            await adminService.rejectWithdrawalRequest(id, rejectionReason);

            setTimeout(() => {
                triggerActionModal({
                    title: 'Request Declined',
                    message: 'The withdrawal transaction has been cancelled.',
                    icon: 'XCircle',
                    type: 'info',
                    confirmLabel: 'Close',
                    onConfirm: () => setActionModalVisible(false)
                });
            }, 500);

            setSelectedRequest(null);
            setShowRejectionInput(false);
            setRejectionReason('');
            loadRequests();
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to reject request';
            setTimeout(() => {
                triggerActionModal({
                    title: 'Action Failed',
                    message: errorMsg,
                    icon: 'X',
                    type: 'error',
                    confirmLabel: 'Retry'
                });
            }, 500);
        } finally {
            setProcessing(false);
        }
    };

    const getFilteredData = useCallback((tab) => {
        let result = requests;
        if (tab !== 'All') {
            const statusMap = { 'Pending': 'PENDING', 'Approved': 'APPROVED', 'Rejected': 'REJECTED' };
            result = result.filter(r => r.status === statusMap[tab]);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(r =>
                (r.userId && r.userId.toString().toLowerCase().includes(lowerQuery)) ||
                (r.userIdString && r.userIdString.toLowerCase().includes(lowerQuery)) ||
                (r.userIdStr && r.userIdStr.toLowerCase().includes(lowerQuery)) ||
                (r.userName && r.userName.toLowerCase().includes(lowerQuery)) ||
                (r.amount && r.amount.toString().includes(lowerQuery))
            );
        }
        return result;
    }, [requests, searchQuery]);

    const handleTabPress = (tab) => {
        setActiveTab(tab);
        const index = TABS.indexOf(tab);
        pagerRef.current?.scrollToIndex({ index, animated: true });
    };

    const renderHeader = () => {
        if (searchVisible) {
            return (
                <View style={styles.header}>
                    <View style={styles.searchContainer}>
                        <Search size={18} color={theme.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search client or ID..."
                            placeholderTextColor={theme.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => { setSearchVisible(false); setSearchQuery(''); }}>
                            <X size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }
        return (
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Withdrawal Entries</Text>
                    <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{getFilteredData(activeTab).length}</Text></View>
                </View>
                <TouchableOpacity onPress={() => setSearchVisible(true)} style={styles.searchBtn}>
                    <Search size={22} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderItem = ({ item }) => {
        const isPending = item.status === 'PENDING';
        const isApproved = item.status === 'APPROVED';
        const statusColor = isPending ? theme.warning : isApproved ? theme.success : theme.error;
        const statusBg = isPending ? theme.warningBg : isApproved ? theme.successBg : theme.errorBg;

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={styles.card}
                onPress={() => {
                    setSelectedRequest(item);
                    setShowRejectionInput(false);
                    setShowApprovalInput(false);
                    setRejectionReason('');
                }}
            >
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardMain}>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={styles.clientName}
                                numberOfLines={1}
                                adjustsFontSizeToFit={true}
                                minimumFontScale={0.7}
                            >
                                {item.userName || 'Unknown Client'}
                            </Text>
                            <View style={styles.metaRow}>
                                <Hash size={12} color={theme.textSecondary} />
                                <Text style={styles.userIdText}>{item.userIdString || item.userIdStr || item.userId}</Text>
                                <View style={styles.dot} />
                                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
                            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                                <Text style={[styles.statusPillText, { color: statusColor }]}>{item.status}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            <View style={styles.tabsWrapper}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                        onPress={() => handleTabPress(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                        {activeTab === tab && <View style={styles.activeTabDot} />}
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
            ) : (
                <FlatList
                    ref={pagerRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    data={TABS}
                    keyExtractor={tab => tab}
                    onMomentumScrollEnd={(e) => {
                        const index = Math.round(e.nativeEvent.contentOffset.x / width);
                        setActiveTab(TABS[index]);
                    }}
                    renderItem={({ item: tab }) => (
                        <View style={{ width }}>
                            <FlatList
                                data={getFilteredData(tab)}
                                renderItem={renderItem}
                                keyExtractor={item => item.id.toString()}
                                contentContainerStyle={styles.list}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={Platform.OS === 'android'}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} tintColor={theme.primary} />}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <AlertCircle size={48} color={theme.cardBorder} />
                                        <Text style={styles.emptyText}>No withdrawal requests found</Text>
                                    </View>
                                }
                            />
                        </View>
                    )}
                />
            )}

            {/* Detail Popup Modal */}
            <Modal transparent visible={!!selectedRequest} animationType="fade" onRequestClose={() => setSelectedRequest(null)}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContainer}>
                                {selectedRequest && (
                                    <>
                                        <LinearGradient
                                            colors={
                                                selectedRequest.status === 'PENDING' ? [theme.warning + '20', theme.cardBg] :
                                                    selectedRequest.status === 'APPROVED' ? [theme.success + '20', theme.cardBg] :
                                                        [theme.error + '20', theme.cardBg]
                                            }
                                            style={styles.modalHeader}
                                        >
                                            <View style={styles.modalHeaderTop}>
                                                <Text style={styles.modalSubtitle}>Withdrawal Details</Text>
                                                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedRequest(null)}>
                                                    <X size={20} color={theme.textPrimary} />
                                                </TouchableOpacity>
                                            </View>

                                            <View style={styles.profileSection}>
                                                <View style={styles.avatarPlaceholder}>
                                                    <User size={32} color={theme.primary} />
                                                </View>
                                                <View style={styles.profileInfo}>
                                                    <Text
                                                        style={styles.modalClientName}
                                                        numberOfLines={1}
                                                        adjustsFontSizeToFit={true}
                                                        minimumFontScale={0.7}
                                                    >
                                                        {selectedRequest.userName || 'Unknown Client'}
                                                    </Text>
                                                    <View style={styles.modalIdRow}>
                                                        <Text style={styles.modalIdLabel}>USER ID:</Text>
                                                        <Text style={styles.modalIdValue}>{selectedRequest.userIdString || selectedRequest.userIdStr || selectedRequest.userId}</Text>
                                                        <TouchableOpacity style={styles.copyBtn}><Copy size={12} color={theme.textSecondary} /></TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        </LinearGradient>

                                        <View style={styles.modalBody}>
                                            <View style={styles.amountShowcase}>
                                                <Text style={styles.amountLabel}>Requested Amount</Text>
                                                <Text style={styles.amountValueMain}>{formatCurrency(selectedRequest.amount)}</Text>
                                                <View style={[styles.statusTag, { backgroundColor: selectedRequest.status === 'PENDING' ? theme.warningBg : selectedRequest.status === 'APPROVED' ? theme.successBg : theme.errorBg }]}>
                                                    <Text style={[styles.statusTagText, { color: selectedRequest.status === 'PENDING' ? theme.warning : selectedRequest.status === 'APPROVED' ? theme.success : theme.error }]}>
                                                        {selectedRequest.status}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.detailsGrid}>
                                                <View style={styles.detailsItem}>
                                                    <Calendar size={18} color={theme.primary} />
                                                    <View style={styles.detailsItemContent}>
                                                        <Text style={styles.detailsItemLabel}>Created Date</Text>
                                                        <Text style={styles.detailsItemValue}>{new Date(selectedRequest.createdAt).toLocaleDateString()}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.detailsItem}>
                                                    <Clock size={18} color={theme.primary} />
                                                    <View style={styles.detailsItemContent}>
                                                        <Text style={styles.detailsItemLabel}>Created Time</Text>
                                                        <Text style={styles.detailsItemValue}>{new Date(selectedRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {selectedRequest.status !== 'PENDING' && (
                                                <View style={[styles.detailsGrid, { marginTop: -10 }]}>
                                                    <View style={styles.detailsItem}>
                                                        <Calendar size={18} color={selectedRequest.status === 'APPROVED' ? theme.success : theme.error} />
                                                        <View style={styles.detailsItemContent}>
                                                            <Text style={styles.detailsItemLabel}>{selectedRequest.status === 'APPROVED' ? 'Approved' : 'Rejected'} Date</Text>
                                                            <Text style={styles.detailsItemValue}>{new Date(selectedRequest.updatedAt || selectedRequest.createdAt).toLocaleDateString()}</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.detailsItem}>
                                                        <Clock size={18} color={selectedRequest.status === 'APPROVED' ? theme.success : theme.error} />
                                                        <View style={styles.detailsItemContent}>
                                                            <Text style={styles.detailsItemLabel}>{selectedRequest.status === 'APPROVED' ? 'Approved' : 'Rejected'} Time</Text>
                                                            <Text style={styles.detailsItemValue}>{new Date(selectedRequest.updatedAt || selectedRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            )}

                                            <View style={styles.modalNoteBox}>
                                                <View style={styles.noteBoxHeader}>
                                                    <FileText size={16} color={theme.textSecondary} />
                                                    <Text style={styles.noteBoxTitle}>Client Message</Text>
                                                </View>
                                                <Text style={styles.noteBoxContent}>"{selectedRequest.userNote || 'Client Initiated'}"</Text>
                                            </View>

                                            {selectedRequest.status !== 'PENDING' && selectedRequest.adminComment && (
                                                <View style={styles.modalNoteBox}>
                                                    <View style={styles.noteBoxHeader}>
                                                        <History size={16} color={theme.textSecondary} />
                                                        <Text style={styles.noteBoxTitle}>Admin Remark</Text>
                                                    </View>
                                                    <Text style={styles.noteBoxContent}>"{selectedRequest.adminComment}"</Text>
                                                </View>
                                            )}

                                            <View style={styles.modalFooter}>
                                                {selectedRequest.status === 'PENDING' && !showRejectionInput && !showApprovalInput && (
                                                    <View style={styles.actionGrid}>
                                                        <TouchableOpacity
                                                            style={[styles.primaryActionBtn, { backgroundColor: theme.error }]}
                                                            onPress={() => setShowRejectionInput(true)}
                                                        >
                                                            <XCircle size={18} color="#fff" />
                                                            <Text style={[styles.actionBtnLabel, { color: '#fff' }]}>Reject</Text>
                                                        </TouchableOpacity>

                                                        <TouchableOpacity
                                                            style={[styles.primaryActionBtn, { backgroundColor: theme.success }]}
                                                            onPress={() => setShowApprovalInput(true)}
                                                        >
                                                            <Check size={18} color="#fff" />
                                                            <Text style={[styles.actionBtnLabel, { color: '#fff' }]}>Approve</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                )}

                                                {showApprovalInput && (
                                                    <View style={styles.enhancedActionBox}>
                                                        <Text style={styles.actionLabel}>PAYMENT METHOD</Text>
                                                        <View style={styles.modeGrid}>
                                                            {['Bank Transfer', 'Cash', 'USDT'].map(mode => (
                                                                <TouchableOpacity
                                                                    key={mode}
                                                                    style={[styles.modeBtn, paymentMode === mode && styles.modeBtnActive]}
                                                                    onPress={() => setPaymentMode(mode)}
                                                                >
                                                                    <Text style={[styles.modeText, paymentMode === mode && { color: '#fff' }]}>{mode}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                        <View style={styles.rejectionGrid}>
                                                            <TouchableOpacity style={styles.rejectionCancel} onPress={() => setShowApprovalInput(false)}>
                                                                <Text style={styles.rejectionCancelText}>Cancel</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={[styles.rejectionConfirm, { backgroundColor: theme.success }]}
                                                                onPress={() => handleApprove(selectedRequest.id)}
                                                                disabled={processing}
                                                            >
                                                                {processing ? <ActivityIndicator size="small" color="#fff" /> : (
                                                                    <Text style={styles.rejectionConfirmText}>Confirm & Pay</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                )}

                                                {showRejectionInput && (
                                                    <View style={styles.enhancedActionBox}>
                                                        <Text style={styles.rejectionLabel}>REJECTION REASON</Text>
                                                        <TextInput
                                                            style={styles.rejectionTextarea}
                                                            placeholder="Reason for denying withdrawal..."
                                                            placeholderTextColor={theme.textSecondary}
                                                            value={rejectionReason}
                                                            onChangeText={setRejectionReason}
                                                            multiline
                                                            autoFocus
                                                        />
                                                        <View style={styles.rejectionGrid}>
                                                            <TouchableOpacity style={styles.rejectionCancel} onPress={() => setShowRejectionInput(false)}>
                                                                <Text style={styles.rejectionCancelText}>Back</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity
                                                                style={styles.rejectionConfirm}
                                                                onPress={() => handleReject(selectedRequest.id)}
                                                                disabled={processing}
                                                            >
                                                                {processing ? <ActivityIndicator size="small" color="#fff" /> : (
                                                                    <Text style={styles.rejectionConfirmText}>Reject Request</Text>
                                                                )}
                                                            </TouchableOpacity>
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Premium Action Modal Implementation */}
            <Modal
                transparent
                visible={actionModalVisible}
                animationType="fade"
                onRequestClose={() => setActionModalVisible(false)}
            >
                <View style={styles.actionModalOverlay}>
                    <View style={styles.actionCard}>
                        <View style={[
                            styles.eliteIconBox,
                            {
                                backgroundColor:
                                    actionConfig.type === 'success' ? '#10b98115' :
                                        actionConfig.type === 'error' ? '#ef444415' :
                                            actionConfig.type === 'warning' ? '#f59e0b15' : '#4f46e515'
                            }
                        ]}>
                            {actionConfig.icon === 'Check' && <Check size={36} color="#10b981" />}
                            {actionConfig.icon === 'X' && <X size={36} color="#ef4444" />}
                            {actionConfig.icon === 'XCircle' && <XCircle size={36} color="#ef4444" />}
                            {actionConfig.icon === 'AlertCircle' && <AlertCircle size={36} color="#f59e0b" />}
                            {actionConfig.icon === 'Info' && <Info size={36} color="#4f46e5" />}
                        </View>

                        <Text style={styles.actionTitle}>{actionConfig.title}</Text>
                        <Text style={styles.actionMessage}>{actionConfig.message}</Text>

                        <View style={styles.actionBtnGroup}>
                            {actionConfig.type === 'warning' && (
                                <TouchableOpacity
                                    style={styles.actionCancelBtn}
                                    onPress={() => setActionModalVisible(false)}
                                >
                                    <Text style={styles.actionCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.actionConfirmBtn,
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
                                    style={styles.actionConfirmGradient}
                                >
                                    <Text style={styles.actionConfirmText}>{actionConfig.confirmLabel}</Text>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.background },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    headerBadge: { backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    headerBadgeText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
    backBtn: { padding: 4 },
    searchBtn: { padding: 4, transform: [{ scale: 0.9 }] },

    // Search
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 14, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: theme.cardBorder },
    searchInput: { flex: 1, marginLeft: 10, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },

    // Tabs
    tabsWrapper: { flexDirection: 'row', marginVertical: 8, paddingHorizontal: 20, gap: 8 },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'transparent', position: 'relative', alignItems: 'center', justifyContent: 'center' },
    tabButtonActive: { backgroundColor: theme.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tabText: { color: theme.textSecondary, fontWeight: '600', fontSize: 14 },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    activeTabDot: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },

    // List
    list: { paddingHorizontal: 20, paddingBottom: 30 },
    card: { backgroundColor: theme.cardBg, borderRadius: 20, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, flexDirection: 'row' },
    statusIndicator: { width: 4, height: '100%' },
    cardContent: { flex: 1, padding: 16 },
    cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    clientName: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    userIdText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
    dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.cardBorder },
    dateText: { fontSize: 12, color: theme.textSecondary },
    amountText: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 6, textAlign: 'right' },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusPillText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder + '50', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },

    // Empty State
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 16 },
    emptyText: { color: theme.textSecondary, fontWeight: '600', fontSize: 16 },

    // Enhanced Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: { backgroundColor: theme.cardBg, borderRadius: 32, width: '100%', maxWidth: 450, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: theme.cardBorder },
    modalHeader: { padding: 24, paddingBottom: 30 },
    modalHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalSubtitle: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center' },

    profileSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    profileInfo: { flex: 1 },
    modalClientName: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 2 },
    modalIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modalIdLabel: { fontSize: 10, fontWeight: '700', color: theme.textSecondary },
    modalIdValue: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
    copyBtn: { padding: 4 },

    modalBody: { padding: 24, paddingTop: 0, marginTop: -15 },
    amountShowcase: { backgroundColor: theme.cardBg, borderRadius: 24, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, marginBottom: 24, borderWidth: 1, borderColor: theme.cardBorder },
    amountLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 6 },
    amountValueMain: { fontSize: 32, fontWeight: '900', color: theme.textPrimary, marginBottom: 12 },
    statusTag: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
    statusTagText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },

    detailsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    detailsItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: theme.background, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder },
    detailsItemContent: { flex: 1 },
    detailsItemLabel: { fontSize: 9, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    detailsItemValue: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },

    modalNoteBox: { padding: 16, backgroundColor: theme.primary + '08', borderRadius: 16, borderLeftWidth: 4, borderLeftColor: theme.primary, marginBottom: 20 },
    noteBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    noteBoxTitle: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase' },
    noteBoxContent: { fontSize: 14, color: theme.textPrimary, fontStyle: 'italic', lineHeight: 20 },

    modalFooter: { paddingTop: 4 },
    actionGrid: { flexDirection: 'row', gap: 10 },
    primaryActionBtn: { flex: 1, height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    actionBtnLabel: { fontSize: 15, fontWeight: '800' },

    // Withdrawal Specific
    enhancedActionBox: { gap: 12 },
    actionLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1 },
    modeGrid: { flexDirection: 'row', gap: 8 },
    modeBtn: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', backgroundColor: theme.background },
    modeBtnActive: { backgroundColor: theme.success, borderColor: theme.success },
    modeText: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },

    rejectionLabel: { fontSize: 11, fontWeight: '800', color: theme.error, letterSpacing: 1 },
    rejectionTextarea: { backgroundColor: theme.background, borderRadius: 18, padding: 14, fontSize: 14, color: theme.textPrimary, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: theme.error + '20' },
    rejectionGrid: { flexDirection: 'row', gap: 10 },
    rejectionCancel: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardBorder + '20' },
    rejectionCancelText: { color: theme.textPrimary, fontWeight: '700', fontSize: 14 },
    rejectionConfirm: { flex: 2, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.error },
    rejectionConfirmText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    // Premium Modal Styles
    actionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    actionCard: { width: '100%', maxWidth: 340, backgroundColor: theme.cardBg, borderRadius: 32, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 18, borderWidth: 1, borderColor: theme.cardBorder },
    eliteIconBox: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    actionTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 10, textAlign: 'center' },
    actionMessage: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 30, opacity: 0.8 },
    actionBtnGroup: { flexDirection: 'row', gap: 12, width: '100%' },
    actionCancelBtn: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderWidth: 1, borderColor: theme.cardBorder },
    actionCancelText: { color: theme.textSecondary, fontWeight: '700', fontSize: 15 },
    actionConfirmBtn: { flex: 2, height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    actionConfirmGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    actionConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }
});
