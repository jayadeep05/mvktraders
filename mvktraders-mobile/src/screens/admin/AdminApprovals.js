import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, Alert, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import {
    User,
    Search,
    X,
    Check,
    XCircle,
    Clock,
    Calendar,
    Smartphone,
    Shield,
    ChevronRight,
    ArrowLeft,
    UserCheck,
    UserX,
    Filter,
    ArrowUpRight,
    MapPin,
    Hash,
    Mail,
    Info
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminApprovals({ navigation }) {
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('Pending');
    const TABS = ['All', 'Pending', 'Approved', 'Rejected'];
    const pagerRef = useRef(null);
    const { width } = Dimensions.get('window');
    const [selectedUser, setSelectedUser] = useState(null);
    const [processId, setProcessId] = useState(null);
    const [searchVisible, setSearchVisible] = useState(false);

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
            title: config.title || 'Update',
            message: config.message || '',
            icon: config.icon || 'Info',
            type: config.type || 'info',
            confirmLabel: config.confirmLabel || 'OK',
            onConfirm: config.onConfirm || (() => setActionModalVisible(false))
        });
        setActionModalVisible(true);
    };

    const loadUsers = async () => {
        try {
            const data = await adminService.getAllUsers();
            // Filter only for PENDING_APPROVAL, ACTIVE, REJECTED for this screen
            const relevantStatuses = ['PENDING_APPROVAL', 'ACTIVE', 'REJECTED'];
            const relevant = data.filter(u => relevantStatuses.includes(u.status));
            const sorted = relevant.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setUsers(sorted);
        } catch (error) {
            console.error('❌ Error loading users', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadUsers();
    }, []);

    const handleApprove = async (id, name) => {
        triggerActionModal({
            title: 'Approve User',
            message: `Are you sure you want to activate ${name || 'this user'}? They will be granted immediate access to the platform.`,
            icon: 'UserCheck',
            type: 'success',
            confirmLabel: 'Confirm Approval',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    setProcessId(id);
                    await adminService.approveUser(id);

                    setTimeout(() => {
                        triggerActionModal({
                            title: 'User Verified',
                            message: `${name} has been successfully promoted to ACTIVE status.`,
                            icon: 'Check',
                            type: 'success',
                            confirmLabel: 'Done',
                            onConfirm: () => setActionModalVisible(false)
                        });
                    }, 500);
                    loadUsers();
                    setSelectedUser(null);
                } catch (error) {
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Action Failed',
                            message: 'A network error occurred during the approval process.',
                            icon: 'XCircle',
                            type: 'error',
                            confirmLabel: 'Close'
                        });
                    }, 500);
                } finally {
                    setProcessId(null);
                }
            }
        });
    };

    const handleReject = async (id, name) => {
        triggerActionModal({
            title: 'Reject Request',
            message: `Are you certain you want to decline registration for ${name}? This action is logged for security.`,
            icon: 'UserX',
            type: 'error',
            confirmLabel: 'Confirm Reject',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    setProcessId(id);
                    await adminService.rejectUser(id);

                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Access Denied',
                            message: `The registration request for ${name} has been rejected.`,
                            icon: 'X',
                            type: 'info',
                            confirmLabel: 'Done',
                            onConfirm: () => setActionModalVisible(false)
                        });
                    }, 500);
                    loadUsers();
                    setSelectedUser(null);
                } catch (error) {
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Rejection Failed',
                            message: 'Could not communicate with the authentication server.',
                            icon: 'AlertCircle',
                            type: 'error',
                            confirmLabel: 'Retry'
                        });
                    }, 500);
                } finally {
                    setProcessId(null);
                }
            }
        });
    };

    const getFilteredData = useCallback((tab) => {
        let result = users;
        if (tab !== 'All') {
            const statusMap = { 'Pending': 'PENDING_APPROVAL', 'Approved': 'ACTIVE', 'Rejected': 'REJECTED' };
            result = result.filter(u => u.status === statusMap[tab]);
        }
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(u =>
                (u.name && u.name.toLowerCase().includes(lowerQuery)) ||
                (u.email && u.email.toLowerCase().includes(lowerQuery)) ||
                (u.mobile && u.mobile.includes(lowerQuery))
            );
        }
        return result;
    }, [users, searchQuery]);

    const handleTabPress = (tab) => {
        setActiveTab(tab);
        const index = TABS.indexOf(tab);
        pagerRef.current?.scrollToIndex({ index, animated: true });
    };

    const renderHeader = () => {
        return (
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerTitleBox}>
                        <Text style={styles.headerTitle}>User Approvals</Text>
                        <View style={styles.headerBadge}>
                            <Text style={styles.headerBadgeText}>{getFilteredData(activeTab).length} Total</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        onPress={() => setSearchVisible(!searchVisible)}
                        style={[styles.iconBtn, searchVisible && { backgroundColor: theme.primary + '15' }]}
                    >
                        {searchVisible ? <X size={20} color={theme.primary} /> : <Search size={22} color={theme.textPrimary} />}
                    </TouchableOpacity>
                </View>

                {searchVisible && (
                    <View style={styles.searchWrapper}>
                        <View style={styles.searchContainer}>
                            <Search size={18} color={theme.textSecondary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by name, email or mobile..."
                                placeholderTextColor={theme.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoFocus
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <XCircle size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}

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
            </View>
        );
    };

    const renderItem = ({ item }) => {
        const isPending = item.status === 'PENDING_APPROVAL';
        const isApproved = item.status === 'ACTIVE';
        const isRejected = item.status === 'REJECTED';

        const statusColor = isPending ? theme.warning : isApproved ? theme.success : (isRejected ? theme.error : theme.textSecondary);
        const statusLabel = isPending ? 'Pending' : isApproved ? 'Approved' : (isRejected ? 'Rejected' : item.status);
        const StatusIcon = isPending ? Clock : isApproved ? UserCheck : (isRejected ? UserX : User);

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.card}
                onPress={() => setSelectedUser(item)}
            >
                <View style={styles.cardContent}>
                    {/* Top Row: Avatar & Status */}
                    <View style={styles.cardTopRow}>
                        <View style={[styles.avatarBox, { backgroundColor: statusColor + '10', borderColor: statusColor + '20' }]}>
                            <User size={22} color={statusColor} />
                            {isPending && <View style={styles.newBadgeDot} />}
                        </View>

                        <View style={styles.mainMeta}>
                            <Text style={styles.userName} numberOfLines={1}>{item.name || 'Unknown User'}</Text>
                            <View style={styles.roleBadgeBox}>
                                <Shield size={10} color={theme.primary} />
                                <Text style={styles.roleBadgeText}>{item.role || 'CLIENT'}</Text>
                            </View>
                        </View>

                        <View style={[styles.statusTag, { backgroundColor: statusColor + '08', borderColor: statusColor + '15' }]}>
                            <StatusIcon size={12} color={statusColor} />
                            <Text style={[styles.statusTagText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                    </View>

                    {/* Middle Row: Contact Brief */}
                    <View style={styles.briefGrid}>
                        <View style={styles.briefItem}>
                            <Text style={styles.briefLabel}>Email Address</Text>
                            <Text style={styles.briefValue} numberOfLines={1}>{item.email || 'No email provided'}</Text>
                        </View>
                        <View style={styles.briefDivider} />
                        <View style={styles.briefItem}>
                            <Text style={styles.briefLabel}>Mobile Number</Text>
                            <Text style={styles.briefValue}>{item.mobile || 'Not provided'}</Text>
                        </View>
                    </View>

                    {/* Footer Row: Timing & Action */}
                    <View style={styles.cardFooter}>
                        <View style={styles.footerTime}>
                            <Calendar size={12} color={theme.textSecondary} />
                            <Text style={styles.footerTimeText}>Registered {new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.actionPrompt}>
                            <Text style={styles.actionPromptText}>Review Request</Text>
                            <ArrowUpRight size={14} color={theme.primary} />
                        </View>
                    </View>
                </View>
                {/* Horizontal Accent Bar for Pending */}
                {isPending && <View style={[styles.accentBar, { backgroundColor: theme.primary }]} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {renderHeader()}

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.loadingText}>Fetching Records...</Text>
                </View>
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
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconCircle}>
                                            <User size={32} color={theme.cardBorder} />
                                        </View>
                                        <Text style={styles.emptyTitle}>No registration found</Text>
                                        <Text style={styles.emptySubtitle}>There are no users matching the current criteria.</Text>
                                    </View>
                                }
                            />
                        </View>
                    )}
                />
            )}

            {/* User Detail Modal */}
            <Modal transparent visible={!!selectedUser} animationType="fade" onRequestClose={() => setSelectedUser(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {selectedUser && (
                            <>
                                <LinearGradient
                                    colors={isDark ? ['#1e1b4b', '#0f172a'] : [theme.primary + '15', theme.cardBg]}
                                    style={styles.modalHeader}
                                >
                                    <View style={styles.modalTopRow}>
                                        <View style={styles.modalHeaderTitleBox}>
                                            <Shield size={16} color={theme.primary} />
                                            <Text style={styles.modalSubtitle}>Account Review</Text>
                                        </View>
                                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedUser(null)}>
                                            <X size={20} color={theme.textPrimary} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.profileHero}>
                                        <View style={styles.avatarLarge}>
                                            <User size={36} color={theme.primary} />
                                            <View style={[styles.statusDot, { backgroundColor: selectedUser.status === 'PENDING_APPROVAL' ? theme.warning : selectedUser.status === 'ACTIVE' ? theme.success : theme.error }]} />
                                        </View>
                                        <View style={styles.heroInfo}>
                                            <Text style={styles.modalUserName}>{selectedUser.name || 'Unknown User'}</Text>
                                            <View style={styles.roleBadge}>
                                                <Text style={styles.roleBadgeText}>{selectedUser.role || 'CLIENT'}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>

                                <View style={styles.modalBody}>
                                    <View style={styles.infoSection}>
                                        <Text style={styles.sectionTitle}>Contact Information</Text>
                                        <View style={styles.infoCard}>
                                            <View style={styles.infoRow}>
                                                <View style={styles.infoIconBox}>
                                                    <Mail size={16} color={theme.primary} />
                                                </View>
                                                <View style={styles.infoContent}>
                                                    <Text style={styles.infoLabel}>Email Address</Text>
                                                    <Text style={styles.infoValue}>{selectedUser.email || 'N/A'}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.infoDivider} />
                                            <View style={styles.infoRow}>
                                                <View style={styles.infoIconBox}>
                                                    <Smartphone size={16} color={theme.primary} />
                                                </View>
                                                <View style={styles.infoContent}>
                                                    <Text style={styles.infoLabel}>Mobile Number</Text>
                                                    <Text style={styles.infoValue}>{selectedUser.mobile || 'N/A'}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.infoSection}>
                                        <Text style={styles.sectionTitle}>Registration Details</Text>
                                        <View style={styles.detailsGrid}>
                                            <View style={styles.detailBox}>
                                                <Calendar size={14} color={theme.textSecondary} />
                                                <View>
                                                    <Text style={styles.detailLabel}>Date</Text>
                                                    <Text style={styles.detailValue}>{new Date(selectedUser.createdAt).toLocaleDateString()}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.detailBox}>
                                                <Hash size={14} color={theme.textSecondary} />
                                                <View>
                                                    <Text style={styles.detailLabel}>Status</Text>
                                                    <Text style={styles.detailValue}>{selectedUser.status}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.modalFooter}>
                                        {selectedUser.status === 'PENDING_APPROVAL' ? (
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.rejectBtn]}
                                                    onPress={() => handleReject(selectedUser.id, selectedUser.name)}
                                                    disabled={!!processId}
                                                >
                                                    <UserX size={20} color={theme.error} />
                                                    <Text style={styles.rejectBtnText}>Reject</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.actionBtn, styles.approveBtn]}
                                                    onPress={() => handleApprove(selectedUser.id, selectedUser.name)}
                                                    disabled={!!processId}
                                                >
                                                    {processId === selectedUser.id ? (
                                                        <ActivityIndicator color="#fff" />
                                                    ) : (
                                                        <>
                                                            <UserCheck size={20} color="#fff" />
                                                            <Text style={styles.approveBtnText}>Approve</Text>
                                                        </>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.alreadyProcessed}>
                                                <View style={[styles.processedBadge, { backgroundColor: selectedUser.status === 'ACTIVE' ? theme.success + '15' : theme.error + '15' }]}>
                                                    <Text style={[styles.processedText, { color: selectedUser.status === 'ACTIVE' ? theme.success : theme.error }]}>
                                                        Request {selectedUser.status === 'ACTIVE' ? 'Approved' : 'Rejected'}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                </View>
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
                            {actionConfig.icon === 'UserCheck' && <UserCheck size={36} color="#10b981" />}
                            {actionConfig.icon === 'UserX' && <UserX size={36} color="#ef4444" />}
                            {actionConfig.icon === 'Check' && <Check size={36} color="#10b981" />}
                            {actionConfig.icon === 'X' && <X size={36} color="#ef4444" />}
                            {actionConfig.icon === 'XCircle' && <XCircle size={36} color="#ef4444" />}
                            {actionConfig.icon === 'Info' && <Info size={36} color="#4f46e5" />}
                        </View>

                        <Text style={styles.actionTitle}>{actionConfig.title}</Text>
                        <Text style={styles.actionMessage}>{actionConfig.message}</Text>

                        <View style={styles.actionBtnGroup}>
                            {(actionConfig.type === 'warning' || actionConfig.confirmLabel.includes('Confirm')) && (
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

const getStyles = (theme, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: theme.textSecondary, fontWeight: '600' },

    // Header
    header: {
        backgroundColor: theme.background,
        paddingBottom: 8,
        zIndex: 10
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12
    },
    headerTitleBox: { flex: 1, marginLeft: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.8 },
    headerBadge: {
        alignSelf: 'flex-start',
        backgroundColor: theme.primary + '12',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginTop: 2
    },
    headerBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '800' },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder },

    searchWrapper: { paddingHorizontal: 20, marginBottom: 12 },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.cardBg,
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2
    },
    searchIcon: { marginRight: 12 },
    searchInput: { flex: 1, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },

    // Tabs
    tabsWrapper: { flexDirection: 'row', marginBottom: 12, paddingHorizontal: 20, gap: 8 },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'transparent', position: 'relative', alignItems: 'center', justifyContent: 'center' },
    tabButtonActive: { backgroundColor: theme.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tabText: { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    activeTabDot: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },

    // List
    list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    card: {
        backgroundColor: theme.cardBg,
        borderRadius: 28,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 6,
        overflow: 'hidden',
        position: 'relative'
    },
    accentBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4 },
    cardContent: { padding: 20 },

    // Top Row
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    avatarBox: {
        width: 52,
        height: 52,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        position: 'relative'
    },
    newBadgeDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: theme.primary,
        borderWidth: 2,
        borderColor: theme.cardBg
    },
    mainMeta: { flex: 1, marginLeft: 15 },
    userName: { fontSize: 18, fontWeight: '900', color: theme.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
    roleBadgeBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    roleBadgeText: { fontSize: 11, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' },

    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1
    },
    statusTagText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Middle Row
    briefGrid: {
        flexDirection: 'row',
        backgroundColor: theme.background,
        borderRadius: 20,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: theme.cardBorder + '60',
    },
    briefItem: { flex: 1 },
    briefLabel: { fontSize: 10, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
    briefValue: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    briefDivider: { width: 1, height: '100%', backgroundColor: theme.cardBorder, marginHorizontal: 15, opacity: 0.5 },

    // Footer
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.cardBorder + '30'
    },
    footerTime: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerTimeText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    actionPrompt: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionPromptText: { fontSize: 12, color: theme.primary, fontWeight: '800' },

    // Empty State
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.cardBorder
    },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', lineHeight: 22 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContainer: {
        backgroundColor: theme.cardBg,
        borderRadius: 36,
        width: '100%',
        maxWidth: 420,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        elevation: 15
    },
    modalHeader: { padding: 28, paddingBottom: 24 },
    modalTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalHeaderTitleBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalSubtitle: { fontSize: 12, fontWeight: '800', color: theme.primary, textTransform: 'uppercase', letterSpacing: 1 },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.cardBorder
    },
    profileHero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarLarge: {
        width: 72,
        height: 72,
        borderRadius: 26,
        backgroundColor: theme.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.cardBorder,
        position: 'relative'
    },
    statusDot: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: theme.cardBg
    },
    heroInfo: { flex: 1 },
    modalUserName: { fontSize: 24, fontWeight: '900', color: theme.textPrimary, marginBottom: 6 },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: theme.primary + '15'
    },
    roleBadgeText: { fontSize: 11, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' },

    modalBody: { padding: 28, paddingTop: 12 },
    infoSection: { marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
    infoCard: {
        backgroundColor: theme.background,
        borderRadius: 20,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.cardBorder
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    infoIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center' },
    infoContent: { marginLeft: 12, flex: 1 },
    infoLabel: { fontSize: 10, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
    infoDivider: { height: 1, backgroundColor: theme.cardBorder + '50', marginHorizontal: 12 },

    detailsGrid: { flexDirection: 'row', gap: 12 },
    detailBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 12,
        backgroundColor: theme.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.cardBorder
    },
    detailLabel: { fontSize: 9, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase' },
    detailValue: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },

    modalFooter: { marginTop: 8 },
    actionButtons: { flexDirection: 'row', gap: 12 },
    actionBtn: {
        flex: 1,
        height: 58,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4
    },
    approveBtn: { backgroundColor: theme.primary },
    rejectBtn: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.error + '30' },
    approveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    rejectBtnText: { color: theme.error, fontSize: 16, fontWeight: '800' },

    alreadyProcessed: { width: '100%' },
    processedBadge: {
        width: '100%',
        height: 58,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent'
    },
    processedText: { fontSize: 15, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Premium Modal Styles
    actionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    actionCard: { width: '100%', maxWidth: 340, backgroundColor: theme.cardBg, borderRadius: 32, padding: 28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 18, borderWidth: 1, borderColor: theme.cardBorder },
    eliteIconBox: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    actionTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 10, textAlign: 'center' },
    actionMessage: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 30, opacity: 0.8 },
    actionBtnGroup: { flexDirection: 'row', gap: 12, width: '100%' },
    actionCancelBtn: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', borderWidth: 1, borderColor: theme.cardBorder },
    actionCancelText: { color: theme.textSecondary, fontWeight: '700', fontSize: 15 },
    actionConfirmBtn: { flex: 2, height: 56, borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    actionConfirmGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    actionConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }
});
