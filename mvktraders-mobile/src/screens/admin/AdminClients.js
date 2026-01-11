import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    StatusBar,
    Platform,
    Alert,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import {
    ArrowLeft,
    Search,
    UserPlus,
    Users,
    ChevronRight,
    TrendingUp,
    Shield,
    ShieldAlert,
    Clock,
    User,
    Mail,
    Filter,
    X,
    Briefcase,
    Calendar,
    ArrowUpRight,
    Wallet
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function AdminClients({ navigation }) {
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [clients, setClients] = useState([]);
    const [inactiveClients, setInactiveClients] = useState([]);
    const [mediators, setMediators] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All'); // All, Active, Inactive
    const [userType, setUserType] = useState('CLIENTS'); // CLIENTS, MEDIATORS
    const TABS = ['All', 'Active', 'Inactive'];
    const pagerRef = useRef(null);

    const loadClients = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [clientsData, inactiveClientsData, allUsers] = await Promise.all([
                adminService.getClientsSummary(),
                adminService.getInactiveClientsSummary(),
                adminService.getAllUsers()
            ]);

            setClients(clientsData || []);
            setInactiveClients(inactiveClientsData || []);
            const mediatorsData = allUsers.filter(user => user.role === 'MEDIATOR');
            setMediators(mediatorsData || []);
        } catch (error) {
            console.error('❌ Error loading data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery, activeTab, userType]);

    const getFilteredData = useCallback((tab) => {
        let result = [];
        if (userType === 'CLIENTS') {
            if (tab === 'Active') {
                result = [...clients];
            } else if (tab === 'Inactive') {
                result = [...inactiveClients];
            } else {
                result = [...clients, ...inactiveClients];
            }
        } else {
            if (tab === 'Active') {
                result = mediators.filter(m => m.status === 'ACTIVE');
            } else if (tab === 'Inactive') {
                result = mediators.filter(m => m.status !== 'ACTIVE');
            } else {
                result = [...mediators];
            }
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(item => {
                const name = (userType === 'CLIENTS' ? item.clientName : item.name) || '';
                const id = (item.userId || item.user_id || item.id || '').toString();
                return name.toLowerCase().includes(lowerQuery) || id.toLowerCase().includes(lowerQuery);
            });
        }
        return result;
    }, [clients, inactiveClients, mediators, searchQuery, userType]);

    useEffect(() => {
        loadClients();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadClients(false);
    };

    const handleSearch = (text) => {
        setSearchQuery(text);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const index = TABS.indexOf(tab);
        pagerRef.current?.scrollToIndex({ index, animated: true });
    };

    const handleUserTypeChange = (type) => {
        setUserType(type);
        setSearchQuery('');
        setActiveTab('All');
        pagerRef.current?.scrollToIndex({ index: 0, animated: true });
    };

    const renderClientItem = ({ item }) => {
        const isClient = userType === 'CLIENTS';
        const displayName = isClient ? item.clientName : item.name;
        const status = item.status;
        const statusColor = status === 'ACTIVE' ? theme.success :
            status === 'PENDING_APPROVAL' ? theme.warning :
                theme.error;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    if (isClient) {
                        navigation.navigate('AdminClientDetails', { clientId: item.clientId, clientName: item.clientName });
                    } else {
                        navigation.navigate('AdminMediatorDetails', { mediatorId: item.id, mediatorName: item.name });
                    }
                }}
                activeOpacity={0.8}
            >
                <View style={[styles.accentStrip, { backgroundColor: statusColor }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardTop}>
                        <View style={[styles.avatarBox, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '20' }]}>
                            {isClient ? <User size={22} color={theme.primary} /> : <Shield size={22} color={theme.primary} />}
                        </View>

                        <View style={styles.mainInfo}>
                            <Text style={styles.clientName} numberOfLines={1}>{displayName || 'Unknown User'}</Text>
                            <View style={styles.idRow}>
                                <Text style={styles.idText}>ID: {item.userId || (isClient ? item.clientId : item.id)?.toString().slice(0, 8)}</Text>
                                <View style={styles.dot} />
                                <Text style={styles.idText}>{new Date(item.createdOn || item.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>

                        <ChevronRight size={20} color={theme.textSecondary} style={{ opacity: 0.3 }} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header Section */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.titleBox}>
                        <Text style={styles.headerTitle}>Portfolio Hub</Text>
                        <Text style={styles.headerSubtitle}>Manage all your assets</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('AdminCreateUser')}
                        style={styles.addBtn}
                    >
                        <LinearGradient
                            colors={[theme.primary, theme.primary + 'CC']}
                            style={styles.addBtnGradient}
                        >
                            <UserPlus size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* User Type Segmented Control */}
                <View style={styles.segmentContainer}>
                    <View style={styles.segmentWrapper}>
                        <TouchableOpacity
                            style={[styles.segmentBtn, userType === 'CLIENTS' && styles.segmentBtnActive]}
                            onPress={() => handleUserTypeChange('CLIENTS')}
                        >
                            <Users size={16} color={userType === 'CLIENTS' ? theme.primary : theme.textSecondary} />
                            <Text style={[styles.segmentText, userType === 'CLIENTS' && styles.segmentTextActive]}>Clients</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.segmentBtn, userType === 'MEDIATORS' && styles.segmentBtnActive]}
                            onPress={() => handleUserTypeChange('MEDIATORS')}
                        >
                            <Shield size={16} color={userType === 'MEDIATORS' ? theme.primary : theme.textSecondary} />
                            <Text style={[styles.segmentText, userType === 'MEDIATORS' && styles.segmentTextActive]}>Mediators</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search & Tabs Overlay */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Search size={18} color={theme.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder={`Search ${userType.toLowerCase()}...`}
                            placeholderTextColor={theme.textSecondary}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <X size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Status Tabs Overlay */}
                <View style={styles.tabsWrapper}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                            onPress={() => handleTabChange(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                            {activeTab === tab && <View style={styles.activeTabDot} />}
                        </TouchableOpacity>
                    ))}
                </View>
                {/* <View style={styles.tabResultsContainer}>
                    <Text style={styles.tabResultsText}>{filteredData.length} records found</Text>
                </View> */}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.loadingText}>Fetching records...</Text>
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
                                renderItem={renderClientItem}
                                keyExtractor={item => (item.clientId || item.id || item.userId || Math.random()).toString()}
                                contentContainerStyle={styles.list}
                                showsVerticalScrollIndicator={false}
                                initialNumToRender={10}
                                maxToRenderPerBatch={10}
                                windowSize={5}
                                removeClippedSubviews={Platform.OS === 'android'}
                                refreshControl={
                                    <RefreshControl
                                        refreshing={refreshing}
                                        onRefresh={onRefresh}
                                        tintColor={theme.primary}
                                    />
                                }
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconCircle}>
                                            <Users size={40} color={theme.cardBorder} />
                                        </View>
                                        <Text style={styles.emptyTitle}>No Results</Text>
                                        <Text style={styles.emptySubtitle}>Try adjusting your filters or search terms.</Text>
                                    </View>
                                }
                            />
                        </View>
                    )}
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: theme.textSecondary, fontWeight: '600' },

    // Header
    header: { backgroundColor: theme.background, zIndex: 10 },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
    titleBox: { flex: 1, marginLeft: 10 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: theme.textPrimary, letterSpacing: -0.8 },
    headerSubtitle: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
    addBtn: { width: 42, height: 42, borderRadius: 14, overflow: 'hidden', elevation: 2, shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    addBtnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Segmented Control
    segmentContainer: { paddingHorizontal: 20, marginBottom: 12 },
    segmentWrapper: {
        flexDirection: 'row',
        backgroundColor: theme.cardBg,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.cardBorder
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 12
    },
    segmentBtnActive: {
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : theme.primary + '10',
    },
    segmentText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    segmentTextActive: { color: theme.primary, fontWeight: '800' },

    // Search Row
    searchRow: { paddingHorizontal: 20, marginBottom: 16 },
    searchBox: {
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
    searchInput: { flex: 1, marginLeft: 12, color: theme.textPrimary, fontSize: 15, fontWeight: '500' },

    // Tabs
    tabsWrapper: { flexDirection: 'row', marginVertical: 8, paddingHorizontal: 20, gap: 8 },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'transparent', position: 'relative', alignItems: 'center', justifyContent: 'center' },
    tabButtonActive: { backgroundColor: theme.cardBg, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    tabText: { color: theme.textSecondary, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: theme.primary, fontWeight: '700' },
    activeTabDot: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },
    tabResultsContainer: { paddingHorizontal: 20, marginBottom: 8, alignItems: 'flex-end' },
    tabResultsText: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Card Styling
    list: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
    card: {
        backgroundColor: theme.cardBg,
        borderRadius: 30,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 6,
        position: 'relative',
        overflow: 'hidden'
    },
    accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    cardContent: { padding: 20 },

    cardTop: { flexDirection: 'row', alignItems: 'center' },
    avatarBox: {
        width: 54,
        height: 54,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    mainInfo: { flex: 1, marginLeft: 16 },
    clientName: { fontSize: 18, fontWeight: '900', color: theme.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
    idRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    idText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    roleBadge: {
        backgroundColor: theme.primary + '10',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    roleBadgeText: { fontSize: 10, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1
    },
    statusInnerDot: { width: 6, height: 6, borderRadius: 3 },
    statusBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },

    cardStatsWrapper: {
        marginTop: 20,
        borderRadius: 20,
        backgroundColor: theme.background,
        borderWidth: 1,
        borderColor: theme.cardBorder + '60',
        overflow: 'hidden'
    },
    statGrid: { flexDirection: 'row', padding: 16 },
    statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    statIconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: theme.primary + '12',
        alignItems: 'center',
        justifyContent: 'center'
    },
    statContent: { flex: 1 },
    statLabel: { fontSize: 10, fontWeight: '800', color: theme.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    statValue: { fontSize: 14, fontWeight: '800', color: theme.textPrimary },
    statDivider: { width: 1, height: '100%', backgroundColor: theme.cardBorder, marginHorizontal: 4, opacity: 0.5 },

    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: theme.cardBorder + '30'
    },
    footerDate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerDateText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    actionPrompt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionPromptText: { fontSize: 12, color: theme.primary, fontWeight: '800' },

    // Empty State
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: theme.cardBorder },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: theme.textSecondary, textAlign: 'center' }
});
