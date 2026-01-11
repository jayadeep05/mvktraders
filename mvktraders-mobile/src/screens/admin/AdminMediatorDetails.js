import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import {
    ArrowLeft,
    Users,
    Shield,
    TrendingUp,
    ChevronRight,
    Mail,
    Phone,
    Calendar,
    Wallet
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminMediatorDetails({ route, navigation }) {
    const { mediatorId, mediatorName } = route.params;
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [mediatorInfo, setMediatorInfo] = useState(null);

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            // Get all users to find mediator info (since we don't have a specific mediator details endpoint yet)
            const allUsers = await adminService.getAllUsers();
            const mediator = allUsers.find(u => u.id === mediatorId);
            setMediatorInfo(mediator);

            // Get clients managed by this mediator
            const clientsData = await adminService.getMediatorClients(mediatorId);
            setClients(clientsData);
        } catch (error) {
            console.error('Error loading mediator details:', error);
            Alert.alert('Error', 'Failed to load mediator details');
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
        loadData(false);
    }, []);

    const totalManagedVolume = useMemo(() => {
        return clients.reduce((sum, client) => sum + (client.totalInvested || 0), 0);
    }, [clients]);

    const renderClientItem = ({ item }) => (
        <TouchableOpacity
            style={styles.clientCard}
            onPress={() => navigation.navigate('AdminClientDetails', {
                clientId: item.clientId,
                clientName: item.clientName
            })}
            activeOpacity={0.7}
        >
            <View style={styles.clientCardContent}>
                <View style={styles.clientMainInfo}>
                    <Text style={styles.clientName}>{item.clientName}</Text>
                    <Text style={styles.clientEmail}>{item.email}</Text>
                </View>
                <View style={styles.clientAmountInfo}>
                    <Text style={styles.clientAmount}>{formatCurrency(item.totalInvested)}</Text>
                    <View style={styles.chevronBox}>
                        <ChevronRight size={16} color={theme.textSecondary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading performance data...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Mediator Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={clients}
                renderItem={renderClientItem}
                keyExtractor={item => item.clientId || item.id}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <>
                        {/* Mediator Info Card */}
                        <View style={styles.mediatorInfoCard}>
                            <LinearGradient
                                colors={isDark ? ['#1e1b4b', '#1e1b4b'] : ['#f8fafc', '#f1f5f9']}
                                style={StyleSheet.absoluteFill}
                                borderRadius={24}
                            />
                            <View style={styles.profileSection}>
                                <View style={styles.avatarCircle}>
                                    <Shield size={32} color={theme.primary} />
                                </View>
                                <View style={styles.profileMeta}>
                                    <Text style={styles.mediatorNameText}>{mediatorName}</Text>
                                    <View style={styles.badgeRow}>
                                        <View style={[styles.roleBadge, { backgroundColor: theme.primary + '15' }]}>
                                            <Text style={[styles.roleBadgeText, { color: theme.primary }]}>OFFICIAL MEDIATOR</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.contactInfo}>
                                <View style={styles.infoRow}>
                                    <Mail size={16} color={theme.textSecondary} />
                                    <Text style={styles.infoText}>{mediatorInfo?.email || 'N/A'}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Phone size={16} color={theme.textSecondary} />
                                    <Text style={styles.infoText}>{mediatorInfo?.mobile || 'N/A'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Performance Stats */}
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <View style={[styles.statIconBox, { backgroundColor: theme.primary + '10' }]}>
                                    <Users size={20} color={theme.primary} />
                                </View>
                                <Text style={styles.statValue}>{clients.length}</Text>
                                <Text style={styles.statLabel}>Active Clients</Text>
                            </View>
                            <View style={styles.statBox}>
                                <View style={[styles.statIconBox, { backgroundColor: theme.success + '10' }]}>
                                    <Wallet size={20} color={theme.success} />
                                </View>
                                <Text style={styles.statValue}>{formatCurrency(totalManagedVolume)}</Text>
                                <Text style={styles.statLabel}>Managed Assets</Text>
                            </View>
                        </View>

                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Managed Clients</Text>
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeCountText}>{clients.length}</Text>
                            </View>
                        </View>
                    </>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Users size={48} color={theme.textSecondary} style={{ opacity: 0.2 }} />
                        <Text style={styles.emptyText}>This mediator doesn't have any assigned clients yet.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: theme.textSecondary, fontWeight: '600' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: theme.background
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary },

    list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },

    mediatorInfoCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    profileSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.primary + '12', alignItems: 'center', justifyContent: 'center' },
    profileMeta: { flex: 1 },
    mediatorNameText: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    badgeRow: { flexDirection: 'row' },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    roleBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    contactInfo: { gap: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder + '50', paddingTop: 20 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    infoText: { fontSize: 14, color: theme.textPrimary, fontWeight: '500' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
    statBox: {
        flex: 1,
        backgroundColor: theme.cardBg,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        alignItems: 'center'
    },
    statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    statValue: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    statLabel: { fontSize: 11, fontWeight: '600', color: theme.textSecondary },

    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary },
    badgeCount: { backgroundColor: theme.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    badgeCountText: { color: theme.primary, fontSize: 11, fontWeight: '800' },

    clientCard: {
        backgroundColor: theme.cardBg,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        overflow: 'hidden'
    },
    clientCardContent: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    clientMainInfo: { flex: 1 },
    clientName: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
    clientEmail: { fontSize: 12, color: theme.textSecondary },
    clientAmountInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    clientAmount: { fontSize: 15, fontWeight: '700', color: theme.primary },
    chevronBox: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.cardBorder + '30', alignItems: 'center', justifyContent: 'center' },

    emptyContainer: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: theme.textSecondary, textAlign: 'center', fontSize: 14, marginTop: 12 }
});
