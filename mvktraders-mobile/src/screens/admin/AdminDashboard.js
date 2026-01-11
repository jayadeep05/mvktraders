import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    Users,
    Wallet,
    ArrowDownLeft,
    CheckCircle,
    Clock,
    Bell,
    Menu,
    TrendingUp, // ArrowUpRight replaced with TrendingUp
    UserPlus,
    FileText,
    ChevronRight,
    Search,
    LogOut,
    Trash2
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';

export default function AdminDashboard({ navigation }) {
    const { logout, user } = useAuth();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Dashboard Data
    const [stats, setStats] = useState({
        totalClients: 0,
        totalInvested: 0,
        pendingUsers: 0,
        pendingWithdrawals: 0,
        pendingDeletions: 0,
        pendingDeposits: 0
    });
    const [pendingUserList, setPendingUserList] = useState([]);
    const [pendingWithdrawalList, setPendingWithdrawalList] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);


    const loadData = async () => {
        try {
            const [usersRes, clientsRes, pendingUsersRes, withdrawalsRes, deleteRequestsRes, depositsRes] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getClientsSummary(),
                adminService.getPendingUsers(),
                adminService.getAllWithdrawalRequests(),
                adminService.getAllDeleteRequests(),
                adminService.getAllDepositRequests()
            ]);

            // Calculate Stats
            const totalClientsCount = usersRes.filter(u => u.role === 'CLIENT').length;
            const activeClients = usersRes.filter(u => u.role === 'CLIENT' && u.status === 'ACTIVE').length;
            const totalInvested = clientsRes.reduce((sum, client) => sum + (client.totalInvested || 0), 0);
            const pendingW = withdrawalsRes.filter(w => w.status === 'PENDING');
            const pendingD = deleteRequestsRes.filter(d => d.status === 'PENDING');
            const pendingDep = depositsRes.filter(d => d.status === 'PENDING');

            setStats({
                totalClients: totalClientsCount,
                activeClients: activeClients,
                totalInvested: totalInvested,
                pendingUsers: pendingUsersRes.length,
                pendingWithdrawals: pendingW.length,
                pendingDeletions: pendingD.length,
                pendingDeposits: pendingDep.length
            });

            setPendingUserList(pendingUsersRes.slice(0, 3)); // Preview top 3
            setPendingWithdrawalList(pendingW.slice(0, 3)); // Preview top 3

        } catch (error) {
            console.error('Admin Dashboard Load Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const handleLogout = () => {
        logout();
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.welcomeContainer}>
                            <Text style={styles.headerTitle}>Hi {user?.name || 'Admin'},</Text>
                            <Text style={styles.headerSubtitle}>Portfolio Management</Text>
                        </View>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            onPress={() => setShowNotifications(!showNotifications)}
                            style={[styles.notificationIconBtn, showNotifications && styles.notificationIconBtnActive]}
                        >
                            <Bell size={20} color={showNotifications ? theme.primary : theme.textPrimary} />
                            {(stats.pendingUsers + stats.pendingWithdrawals + stats.pendingDeletions + stats.pendingDeposits) > 0 && (
                                <View style={styles.notificationBadge} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.profileBtn}>
                            <LinearGradient
                                colors={[theme.primary, theme.primary + 'CC']}
                                style={styles.profileGradient}
                            >
                                <Users size={18} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Overlay to close dropdown */}
                {showNotifications && (
                    <TouchableOpacity
                        style={styles.dropdownOverlay}
                        activeOpacity={1}
                        onPress={() => setShowNotifications(false)}
                    />
                )}

                {/* Notifications Dropdown */}
                {showNotifications && (
                    <View style={styles.notificationsDropdown}>
                        <View style={styles.dropdownBeak} />
                        <View style={styles.dropdownHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Bell size={16} color={theme.primary} />
                                <Text style={styles.dropdownTitle}>Notifications</Text>
                            </View>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeText}>
                                    {stats.pendingUsers + stats.pendingWithdrawals + stats.pendingDeletions + stats.pendingDeposits}
                                </Text>
                            </View>
                        </View>

                        <ScrollView bounces={false} contentContainerStyle={{ paddingVertical: 8 }}>
                            <TouchableOpacity
                                style={styles.notifItem}
                                onPress={() => { setShowNotifications(false); navigation.navigate('AdminApprovals'); }}
                            >
                                <View style={[styles.notifIcon, { backgroundColor: theme.primary + '10' }]}>
                                    <UserPlus size={16} color={theme.primary} />
                                </View>
                                <View style={styles.notifContent}>
                                    <Text style={styles.notifText}>User Registrations</Text>
                                    <Text style={styles.notifCount}>{stats.pendingUsers} new requests</Text>
                                </View>
                                <ChevronRight size={14} color={theme.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.notifItem}
                                onPress={() => { setShowNotifications(false); navigation.navigate('AdminWithdrawals'); }}
                            >
                                <View style={[styles.notifIcon, { backgroundColor: theme.error + '10' }]}>
                                    <ArrowDownLeft size={16} color={theme.error} />
                                </View>
                                <View style={styles.notifContent}>
                                    <Text style={styles.notifText}>Withdrawal Requests</Text>
                                    <Text style={styles.notifCount}>{stats.pendingWithdrawals} requests pending</Text>
                                </View>
                                <ChevronRight size={14} color={theme.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.notifItem}
                                onPress={() => { setShowNotifications(false); navigation.navigate('AdminDeposits'); }}
                            >
                                <View style={[styles.notifIcon, { backgroundColor: theme.success + '10' }]}>
                                    <TrendingUp size={16} color={theme.success} />
                                </View>
                                <View style={styles.notifContent}>
                                    <Text style={styles.notifText}>Deposit Requests</Text>
                                    <Text style={styles.notifCount}>{stats.pendingDeposits} pending deposits</Text>
                                </View>
                                <ChevronRight size={14} color={theme.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.notifItem, { borderBottomWidth: 0 }]}
                                onPress={() => { setShowNotifications(false); navigation.navigate('AdminDeleteRequests'); }}
                            >
                                <View style={[styles.notifIcon, { backgroundColor: theme.error + '10' }]}>
                                    <Trash2 size={16} color={theme.error} />
                                </View>
                                <View style={styles.notifContent}>
                                    <Text style={styles.notifText}>Deletion Requests</Text>
                                    <Text style={styles.notifCount}>{stats.pendingDeletions} account deletions</Text>
                                </View>
                                <ChevronRight size={14} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                )}

                {/* Stats Grid - PREMIUM HERO CARD */}
                <View style={styles.statsGrid}>
                    <View style={styles.mainBalanceCard}>
                        <LinearGradient
                            colors={isDark ? ['#1e1b4b', '#100e2b'] : ['#2563eb', '#1d4ed8']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.balanceGradient}
                        >
                            <View style={styles.balanceHeader}>
                                <View>
                                    <Text style={styles.balanceLabel}>TOTAL ASSETS</Text>
                                    <Text style={styles.balanceValue}>{formatCurrency(stats.totalInvested)}</Text>
                                </View>
                                <View style={styles.balanceIconCircle}>
                                    <Wallet size={24} color="#fff" />
                                </View>
                            </View>
                            <View style={styles.balanceFooter}>
                                <View style={styles.balanceMeta}>
                                    <Users size={14} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.balanceMetaText}>{stats.activeClients} Active Clients</Text>
                                </View>
                                <View style={styles.balanceMeta}>
                                    <Clock size={14} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.balanceMetaText}>{stats.pendingUsers + stats.pendingWithdrawals + stats.pendingDeletions} Pending</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                </View>

                {/* Quick Actions - BEAUTIFUL GRID */}
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminClients')}>
                        {stats.totalClients > 0 && <View style={[styles.cardBadge, { backgroundColor: theme.primary }]}><Text style={styles.cardBadgeText}>{stats.totalClients}</Text></View>}
                        <View style={[styles.actionIconBox, { backgroundColor: theme.primary + '12' }]}>
                            <Users size={20} color={theme.primary} />
                        </View>
                        <Text style={styles.actionLabel}>All Clients</Text>
                        <Text style={styles.actionSubtext}>View portfolio</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminApprovals')}>
                        {stats.pendingUsers > 0 && <View style={styles.cardBadge}><Text style={styles.cardBadgeText}>{stats.pendingUsers}</Text></View>}
                        <View style={[styles.actionIconBox, { backgroundColor: theme.primary + '12' }]}>
                            <UserPlus size={20} color={theme.primary} />
                        </View>
                        <Text style={styles.actionLabel}>User Approvals</Text>
                        <Text style={styles.actionSubtext}>Review signups</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminDeposits')}>
                        {stats.pendingDeposits > 0 && <View style={[styles.cardBadge, { backgroundColor: theme.success }]}><Text style={styles.cardBadgeText}>{stats.pendingDeposits}</Text></View>}
                        <View style={[styles.actionIconBox, { backgroundColor: theme.success + '12' }]}>
                            <TrendingUp size={20} color={theme.success} />
                        </View>
                        <Text style={styles.actionLabel}>Deposits</Text>
                        <Text style={styles.actionSubtext}>Verify payments</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminWithdrawals')}>
                        {stats.pendingWithdrawals > 0 && <View style={styles.cardBadge}><Text style={styles.cardBadgeText}>{stats.pendingWithdrawals}</Text></View>}
                        <View style={[styles.actionIconBox, { backgroundColor: theme.error + '12' }]}>
                            <ArrowDownLeft size={20} color={theme.error} />
                        </View>
                        <Text style={styles.actionLabel}>Withdrawals</Text>
                        <Text style={styles.actionSubtext}>Process requests</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('AdminDeleteRequests')}>
                        {stats.pendingDeletions > 0 && <View style={styles.cardBadge}><Text style={styles.cardBadgeText}>{stats.pendingDeletions}</Text></View>}
                        <View style={[styles.actionIconBox, { backgroundColor: theme.error + '12' }]}>
                            <Trash2 size={20} color={theme.error} />
                        </View>
                        <Text style={styles.actionLabel}>Deletions</Text>
                        <Text style={styles.actionSubtext}>Account removal</Text>
                    </TouchableOpacity>

                    <View style={[styles.actionCard, styles.comingSoonCard]}>
                        <View style={[styles.actionIconBox, { backgroundColor: theme.textSecondary + '08' }]}>
                            <Clock size={20} color={theme.textSecondary} />
                        </View>
                        <Text style={styles.actionLabel}>Coming Soon</Text>
                        <Text style={styles.actionSubtext}>More features</Text>
                    </View>
                </View>


                <View style={{ height: 32 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { justifyContent: 'center', alignItems: 'center' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingTop: 8, paddingBottom: 16, backgroundColor: theme.background },
    headerLeft: { flex: 1 },
    welcomeContainer: { gap: 2 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: -5 },

    // Notification Icon Button
    notificationIconBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: theme.cardBg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: theme.cardBorder,
        position: 'relative',
        zIndex: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3
    },
    notificationIconBtnActive: {
        borderColor: theme.primary,
        backgroundColor: theme.primary + '10',
        shadowColor: theme.primary,
        shadowOpacity: 0.2,
    },
    notificationBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.error,
        borderWidth: 2,
        borderColor: theme.background,
        shadowColor: theme.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 5
    },

    profileBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
    profileGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Notifications Dropdown
    dropdownOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 150, backgroundColor: 'transparent' },
    notificationsDropdown: { position: 'absolute', top: 80, right: 20, width: 280, backgroundColor: theme.cardBg, borderRadius: 24, borderWidth: 1, borderColor: theme.cardBorder, zIndex: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 20, overflow: 'visible' },
    dropdownBeak: { position: 'absolute', top: -6, right: 65, width: 12, height: 12, backgroundColor: theme.cardBg, transform: [{ rotate: '45deg' }], borderTopWidth: 1, borderLeftWidth: 1, borderColor: theme.cardBorder, zIndex: 181 },
    dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    dropdownTitle: { fontSize: 13, fontWeight: '800', color: theme.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
    totalBadge: { backgroundColor: theme.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    totalBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

    notifItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder + '15' },
    notifIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    notifContent: { flex: 1, marginLeft: 12 },
    notifText: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    notifCount: { fontSize: 11, color: theme.textSecondary, marginTop: 2, fontWeight: '500' },

    emptyNotif: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    checkIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.success + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    emptyNotifText: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    emptyNotifSub: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

    // Stats - PREMIUM HERO CARD
    statsGrid: { marginBottom: 32 },
    mainBalanceCard: { borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
    balanceGradient: { padding: 28 },
    balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    balanceValue: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
    balanceIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    balanceFooter: { flexDirection: 'row', gap: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
    balanceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    balanceMetaText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },

    // Sections
    sectionHeader: { marginBottom: 16 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
    sectionSubtitle: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },

    // Actions - BEAUTIFUL CARDS
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
    actionCard: { width: '48%', backgroundColor: theme.cardBg, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: theme.cardBorder, position: 'relative', shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    actionIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    actionLabel: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
    actionSubtext: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },
    cardBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: theme.error, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, shadowColor: theme.error, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
    cardBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
    comingSoonCard: { opacity: 0.5 },

    // Lists - PREMIUM DESIGN
    seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: theme.primary + '08' },
    seeAll: { color: theme.primary, fontSize: 13, fontWeight: '700' },

    listContainer: { gap: 10 },
    emptyCard: { backgroundColor: theme.cardBg, padding: 40, borderRadius: 24, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', gap: 12 },
    emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.success + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary },
    emptyText: { color: theme.textSecondary, fontSize: 13, fontWeight: '500', textAlign: 'center' },

    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    listAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.primary + '12', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: theme.primary, fontWeight: '800', fontSize: 16 },
    listTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
    listSub: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: theme.warning + '10' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.warning },
    statusText: { fontSize: 11, fontWeight: '700', color: theme.warning, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }
});
