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
    LogOut
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
        pendingWithdrawals: 0
    });
    const [pendingUserList, setPendingUserList] = useState([]);
    const [pendingWithdrawalList, setPendingWithdrawalList] = useState([]);

    const loadData = async () => {
        try {
            const [usersRes, clientsRes, pendingUsersRes, withdrawalsRes] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getClientsSummary(),
                adminService.getPendingUsers(),
                adminService.getAllWithdrawalRequests()
            ]);

            // Calculate Stats
            const activeClients = usersRes.filter(u => u.role === 'CLIENT' && u.status === 'ACTIVE').length;
            const totalInvested = clientsRes.reduce((sum, client) => sum + (client.totalInvested || 0), 0);
            const pendingW = withdrawalsRes.filter(w => w.status === 'PENDING');

            setStats({
                totalClients: activeClients,
                totalInvested: totalInvested,
                pendingUsers: pendingUsersRes.length,
                pendingWithdrawals: pendingW.length
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

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Admin Panel</Text>
                    <Text style={styles.headerSubtitle}>Overview & Controls</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn}>
                    <Users size={20} color={theme.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    {/* Total Invested */}
                    <View style={[styles.statCard, styles.statCardWide]}>
                        <LinearGradient
                            colors={isDark ? ['#1e1b4b', '#312e81'] : ['#eff6ff', '#dbeafe']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.statContent}>
                            <View>
                                <Text style={styles.statLabel}>TOTAL ASSETS (AUM)</Text>
                                <Text style={styles.statValueLarge}>{formatCurrency(stats.totalInvested)}</Text>
                            </View>
                            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
                                <Wallet size={24} color={theme.primary} />
                            </View>
                        </View>
                    </View>

                    {/* Active Clients */}
                    <View style={styles.statCard}>
                        <View style={styles.statContent}>
                            <View>
                                <Text style={styles.statLabel}>CLIENTS</Text>
                                <Text style={styles.statValue}>{stats.totalClients}</Text>
                            </View>
                            <Users size={20} color={theme.success} />
                        </View>
                    </View>

                    {/* Pending Actions Count */}
                    <View style={styles.statCard}>
                        <View style={styles.statContent}>
                            <View>
                                <Text style={styles.statLabel}>PENDING</Text>
                                <Text style={[styles.statValue, { color: stats.pendingUsers > 0 || stats.pendingWithdrawals > 0 ? theme.warning : theme.textPrimary }]}>
                                    {stats.pendingUsers + stats.pendingWithdrawals}
                                </Text>
                            </View>
                            <Clock size={20} color={theme.warning} />
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Management</Text>
                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminApprovals')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                            <UserPlus size={24} color={theme.primary} />
                        </View>
                        <Text style={styles.actionText}>Approvals</Text>
                        {stats.pendingUsers > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingUsers}</Text></View>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminWithdrawals')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <ArrowDownLeft size={24} color={theme.error} />
                        </View>
                        <Text style={styles.actionText}>Withdrawals</Text>
                        {stats.pendingWithdrawals > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{stats.pendingWithdrawals}</Text></View>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminClients')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Users size={24} color={theme.success} />
                        </View>
                        <Text style={styles.actionText}>Clients</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminDeposits')}>
                        <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <TrendingUp size={24} color={theme.success} />
                        </View>
                        <Text style={styles.actionText}>Deposits</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Pending Approvals Preview */}
                <View style={styles.cardHeader}>
                    <Text style={styles.sectionTitle}>Pending Signups</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AdminApprovals')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {pendingUserList.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <CheckCircle size={24} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={styles.emptyText}>All caught up! No pending signups.</Text>
                    </View>
                ) : (
                    pendingUserList.map((user) => (
                        <View key={user.id} style={styles.listItem}>
                            <View style={styles.listAvatar}>
                                <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.listTitle}>{user.name}</Text>
                                <Text style={styles.listSub}>{user.email}</Text>
                            </View>
                            <View style={[styles.statusTag, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                                <Text style={[styles.statusText, { color: theme.warning }]}>Pending</Text>
                            </View>
                        </View>
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: theme.textPrimary, letterSpacing: 0.5 },
    headerSubtitle: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
    iconBtn: { padding: 8, borderRadius: 12, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder },

    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

    // Stats
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    statCard: { flex: 1, minWidth: '48%', backgroundColor: theme.cardBg, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden' },
    statCardWide: { width: '100%', minWidth: '100%', marginBottom: 4 },
    statContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statLabel: { fontSize: 10, color: theme.textSecondary, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    statValue: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    statValueLarge: { fontSize: 28, fontWeight: '700', color: theme.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    iconBox: { padding: 10, borderRadius: 12 },

    // Actions
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 16, letterSpacing: 0.5 },
    actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 30 },
    actionBtn: { width: '48%', backgroundColor: theme.cardBg, padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    actionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    actionText: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    badge: { position: 'absolute', top: 12, right: 12, backgroundColor: theme.error, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

    // Lists
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    seeAll: { color: theme.primary, fontSize: 13, fontWeight: '600' },
    emptyCard: { backgroundColor: theme.cardBg, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', gap: 8, borderStyle: 'dashed' },
    emptyText: { color: theme.textSecondary, fontSize: 13 },

    listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, padding: 12, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.cardBorder },
    listAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primaryBg, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: theme.primary, fontWeight: '700', fontSize: 16 },
    listTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    listSub: { fontSize: 12, color: theme.textSecondary },
    statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }
});
