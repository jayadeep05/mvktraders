import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, TextInput, Animated, Modal, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import config from '../../config';
import {
    ArrowUpRight,
    ArrowDownLeft,
    Bell,
    Menu,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    UserCircle,
    KeyRound,
    LogOut,
    AlignLeft,
    Filter,
    Calendar,
    Banknote,
    Wallet,
    History,
    CalendarClock,
    Eye,
    X,
    Copy,
    Check,
    Clock,
    Maximize2,
    FileText,
    Image as ImageIcon
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { portfolioService, depositService, withdrawalService, clientService, profitService } from '../../api/client';
import { formatCurrency } from '../../utils/formatters';

export default function ClientDashboard({ navigation }) {
    const { logout, user } = useAuth();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data State
    const [portfolio, setPortfolio] = useState(null);
    const [profitHistory, setProfitHistory] = useState([]);
    const [allHistory, setAllHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [filterType, setFilterType] = useState('ALL'); // ALL, DEPOSIT, WITHDRAWAL, PAYOUT
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const ITEMS_PER_PAGE = 4;

    // Notifications
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [clientNotifications, setClientNotifications] = useState([]);

    // UI State
    const [showNotifications, setShowNotifications] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Profit Calculator State
    const [calcAmount, setCalcAmount] = useState('100000');
    const [calcDuration, setCalcDuration] = useState(12);
    const [calcType, setCalcType] = useState('fixed'); // 'fixed' or 'compounded'
    const [calcResult, setCalcResult] = useState({
        fixed: { finalAmount: 0, profit: 0 },
        compounded: { finalAmount: 0, profit: 0 }
    });

    // Payout Modal State
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [fullImageModalVisible, setFullImageModalVisible] = useState(false);
    const [imageZoomed, setImageZoomed] = useState(false);
    const [copied, setCopied] = useState(false);

    // Profit Filter State
    const [selectedProfitYear, setSelectedProfitYear] = useState('All');
    const [showProfitYearFilter, setShowProfitYearFilter] = useState(false);
    const [profitPageHistory, setProfitPageHistory] = useState(1);
    const PROFITS_PER_PAGE = 4;



    // Helper for Image URL
    const API_BASE = config.API_BASE_URL;
    const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path.substring(1) : path;
        return `${API_BASE}/uploads/${cleanPath}`;
    };

    // Copy to Clipboard
    const handleCopy = (text) => {
        // Since Expo Clipboard is not installed, we fallback to Alert or console
        // For real app: import * as Clipboard from 'expo-clipboard'; Clipboard.setStringAsync(text);
        // Here we just simulate
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Animations
    const slideAnim = useRef(new Animated.Value(-300)).current;

    // --- Calculator Logic ---
    useEffect(() => {
        const amount = parseFloat(calcAmount) || 0;
        const duration = parseInt(calcDuration) || 0;
        const fixedRate = 0.04; // 4% monthly
        const compoundedRate = 0.036; // 3.6% monthly

        // Fixed
        const fixedProfit = amount * fixedRate * duration;
        const fixedFinal = amount + fixedProfit;

        // Compounded
        let compoundedFinal = 0;
        let compoundedProfit = 0;
        if (duration > 6) {
            compoundedFinal = amount * Math.pow(1 + compoundedRate, duration);
            compoundedProfit = compoundedFinal - amount;
        }

        setCalcResult({
            fixed: {
                finalAmount: Math.round(fixedFinal),
                profit: Math.round(fixedProfit)
            },
            compounded: {
                finalAmount: duration > 6 ? Math.round(compoundedFinal) : 0,
                profit: duration > 6 ? Math.round(compoundedProfit) : 0
            }
        });

        if (duration <= 6 && calcType === 'compounded') {
            setCalcType('fixed');
        }
    }, [calcAmount, calcDuration, calcType]);

    // --- Scroll Refs ---
    const scrollViewRef = useRef(null);
    const profitSectionRef = useRef(0);
    const historySectionRef = useRef(0);

    const storeSectionY = (key, event) => {
        const layout = event.nativeEvent.layout;
        if (key === 'profit') profitSectionRef.current = layout.y;
        if (key === 'history') historySectionRef.current = layout.y;
    };

    const scrollToSection = (section) => {
        if (!scrollViewRef.current) return;

        let y = 0;
        if (section === 'profit') y = profitSectionRef.current;
        if (section === 'history') y = historySectionRef.current;
        if (section === 'top') y = 0; // Added for scrolling to top

        // Add a small offset or delay if needed, but native scrollTo is usually fine
        // Might need a small timeout to allow sidebar to close first for smoother anim
        setTimeout(() => {
            const finalY = Math.max(0, y - 20);
            scrollViewRef.current.scrollTo({ y: finalY, animated: true });
        }, 350);
    };

    // --- Fetch Data ---
    const loadData = async () => {
        try {
            const [portfolioRes, profitRes, depositsRes, withdrawalsRes, transactionsRes] = await Promise.allSettled([
                portfolioService.getMyPortfolio(),
                profitService.getMyHistory(),
                depositService.getMyRequests(),
                withdrawalService.getMyRequests(),
                clientService.getTransactions()
            ]);

            if (portfolioRes.status === 'fulfilled') {
                setPortfolio(portfolioRes.value);
            }

            // 3. Activity Feed Initialization
            let historyList = [];

            if (depositsRes.status === 'fulfilled') {
                const deposits = depositsRes.value
                    .filter(d => d.status !== 'APPROVED')
                    .map(d => ({ ...d, type: 'DEPOSIT', label: 'Deposit Request' }));
                historyList = [...historyList, ...deposits];
            }
            if (withdrawalsRes.status === 'fulfilled') {
                const withdrawals = withdrawalsRes.value
                    .filter(w => w.status !== 'APPROVED')
                    .map(w => ({ ...w, type: 'WITHDRAWAL', label: 'Withdrawal Request' }));
                historyList = [...historyList, ...withdrawals];
            }

            if (transactionsRes.status === 'fulfilled') {


                // Filter out generic portfolio actions from main history
                // Users want to see Deposits, Withdrawals, and Payouts here
                const transactions = transactionsRes.value
                    .filter(t => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL' || t.type === 'PAYOUT')
                    .map(t => {
                        const desc = (t.description || '').toLowerCase();
                        const isManual = !desc.includes('approved');
                        return {
                            ...t,
                            label: t.type === 'DEPOSIT' ? 'Funds Added' : (t.type === 'PAYOUT' ? 'Payout' : 'Withdrawal'),
                            status: isManual ? 'ADMIN' : (desc.includes('approved') ? 'APPROVED' : 'COMPLETED'),
                            createdAt: t.createdAt || t.date || t.timestamp
                        };
                    });
                historyList = [...historyList, ...transactions];

                if (profitRes.status === 'fulfilled') {
                    // Sort descending
                    const profitHistory = [...profitRes.value];
                    profitHistory.sort((a, b) => new Date(b.calculatedAt || b.createdAt) - new Date(a.calculatedAt || a.createdAt));
                    setProfitHistory(profitHistory);
                }
            } else {
                if (profitRes.status === 'fulfilled') {
                    setProfitHistory(profitRes.value);
                }
            }

            // Sort by Date Descending
            historyList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAllHistory(historyList);

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handle Filter Change
    useEffect(() => {
        if (filterType === 'ALL') {
            setFilteredHistory(allHistory);
        } else {
            setFilteredHistory(allHistory.filter(h => h.type === filterType));
        }

        // Notifications Logic - Moved here to ensure it runs when allHistory updates
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const recentUpdates = allHistory.filter(item => {
            const itemDate = new Date(item.createdAt);
            const isUpdate = (item.type === 'DEPOSIT' || item.type === 'WITHDRAWAL') && item.status !== 'PENDING';
            const isPayout = item.type === 'PAYOUT';
            return (isUpdate || isPayout) && itemDate > threeDaysAgo;
        });

        setClientNotifications(recentUpdates);
        setUnreadNotifications(recentUpdates.length);
        setHistoryPage(1); // Reset to first page on filter change
    }, [filterType, allHistory]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const toggleSidebar = (targetSection = null) => {
        if (mobileMenuOpen) {
            Animated.timing(slideAnim, { toValue: -300, duration: 300, useNativeDriver: true }).start(() => {
                setMobileMenuOpen(false);
                if (targetSection) {
                    scrollToSection(targetSection);
                }
            });
        } else {
            setMobileMenuOpen(true);
            Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
    };




    const totalInvested = portfolio?.totalInvested || 0;
    const totalValue = portfolio?.totalValue || 0;

    // Calculate TOTAL NET PROFIT (TILL DATE) by summing ALL profit history
    // This should NEVER change - it's the lifetime total profit earned
    const totalNetProfit = useMemo(() => {
        return profitHistory.reduce((sum, item) => {
            const amount = item.profitAmount || item.amount || 0;
            return sum + parseFloat(amount);
        }, 0);
    }, [profitHistory]);

    // Get available years from profit history
    const availableProfitYears = useMemo(() => {
        const years = new Set();
        profitHistory.forEach(item => {
            if (item.year) {
                years.add(item.year);
            } else if (item.calculatedAt) {
                years.add(new Date(item.calculatedAt).getFullYear());
            }
        });
        return ['All', ...Array.from(years).sort((a, b) => b - a)];
    }, [profitHistory]);

    // Filter profit history by selected year
    const filteredProfitHistory = useMemo(() => {
        if (selectedProfitYear === 'All') {
            return profitHistory;
        }
        return profitHistory.filter(item => {
            const itemYear = item.year || (item.calculatedAt ? new Date(item.calculatedAt).getFullYear() : null);
            return itemYear === selectedProfitYear;
        });
    }, [profitHistory, selectedProfitYear]);

    // Paginated Profit History
    const paginatedProfitHistory = useMemo(() => {
        const start = (profitPageHistory - 1) * PROFITS_PER_PAGE;
        return filteredProfitHistory.slice(start, start + PROFITS_PER_PAGE);
    }, [filteredProfitHistory, profitPageHistory]);

    const totalProfitPages = Math.ceil(filteredProfitHistory.length / PROFITS_PER_PAGE) || 1;

    // Reset profit page on year change
    useEffect(() => {
        setProfitPageHistory(1);
    }, [selectedProfitYear]);

    // Paginated History
    const paginatedHistory = useMemo(() => {
        const start = (historyPage - 1) * ITEMS_PER_PAGE;
        return filteredHistory.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredHistory, historyPage]);

    const totalHistoryPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE) || 1;

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={toggleSidebar} style={styles.iconBtn}>
                        <Menu size={24} color={theme.headerText} />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerGreeting}>Hello {user?.name?.split(' ')[0] || 'Client'},</Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.notificationBtn}
                        onPress={() => { setShowNotifications(!showNotifications); }}
                    >
                        <Bell size={20} color={unreadNotifications > 0 ? theme.primary : theme.textSecondary} />
                        {unreadNotifications > 0 && <View style={styles.badgeDot} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.profileBtn}
                        onPress={() => { setShowNotifications(false); navigation.navigate('Profile'); }}
                    >
                        <LinearGradient
                            colors={isDark ? ['#6366f1', '#a855f7'] : ['#4f46e5', '#9333ea']}
                            style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                        >
                            <Text style={styles.profileInitial}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>


            {/* Click Outside Handler for Dropdowns */}
            {showNotifications && (
                <TouchableOpacity
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 45 }}
                    activeOpacity={1}
                    onPress={() => { setShowNotifications(false); }}
                />
            )}

            {/* Dropdowns */}
            {showNotifications && (
                <View style={styles.notificationsDropdown}>
                    <View style={styles.dropdownHeader}>
                        <Text style={styles.dropdownTitle}>Updates</Text>
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>{unreadNotifications} New</Text>
                        </View>
                    </View>
                    <ScrollView style={{ maxHeight: 300 }}>
                        {clientNotifications.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Bell size={32} color={theme.textSecondary} style={{ opacity: 0.2, marginBottom: 8 }} />
                                <Text style={styles.emptyText}>No recent updates</Text>
                            </View>
                        ) : (
                            clientNotifications.map((n, i) => (
                                <View key={i} style={styles.notificationItem}>
                                    <View style={[styles.notifIconBox, {
                                        backgroundColor: n.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' :
                                            n.type === 'PAYOUT' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                    }]}>
                                        <Text style={{
                                            color: n.type === 'DEPOSIT' ? theme.success :
                                                n.type === 'PAYOUT' ? theme.primary : theme.error,
                                            fontWeight: 'bold'
                                        }}>
                                            {n.type === 'PAYOUT' ? '₹' : (n.type === 'DEPOSIT' ? '+' : '-')}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={styles.notifTitle}>
                                                {n.type === 'PAYOUT' ? 'Profit Payout' : `${n.type} ${n.status}`}
                                            </Text>
                                            <Text style={styles.notifDate}>
                                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                        <Text style={styles.notifBody}>
                                            {n.type === 'PAYOUT' ? `Received ${formatCurrency(n.amount)}` :
                                                `Request for ${formatCurrency(n.amount)} was ${n.status.toLowerCase()}`}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Main Content */}
            <ScrollView
                ref={scrollViewRef}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                <Text style={styles.pageSubtitle}>Track your capital, profits, and monthly growths</Text>

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}
                        onPress={() => navigation.navigate('Withdrawal', { portfolioData: portfolio })}
                    >
                        <ArrowDownLeft size={18} color="#fff" />
                        <Text style={styles.actionText}>Withdraw</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Deposit', { portfolioData: portfolio })} style={{ flex: 1 }}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.actionButton}
                        >
                            <ArrowUpRight size={18} color="#fff" />
                            <Text style={styles.actionText}>Add Funds</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* --- 4 Stats Cards Grid --- */}
                <View style={styles.statsGrid}>

                    {/* 1. Capital Invested */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.statLabel}>INVESTMENT</Text>
                                <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(totalInvested)}</Text>
                            </View>
                            <View style={[styles.statIconBox, { backgroundColor: theme.primaryBg }]}>
                                <Wallet size={18} color={theme.primary} />
                            </View>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: theme.primaryBg, borderColor: theme.mode === 'dark' ? 'rgba(99, 102, 241, 0.2)' : 'transparent' }]}>
                            <Text style={[styles.statBadgeText, { color: theme.primary }]}>Invested</Text>
                        </View>
                    </View>

                    {/* 2. Next Estimated Payout */}
                    {(() => {
                        // Use the backend-provided estimation if available, else 0.
                        const nextProfit = portfolio?.nextEstimatedPayout || 0;
                        const nextDate = new Date();
                        nextDate.setMonth(nextDate.getMonth() + 1);

                        return (
                            <View style={styles.statCard}>
                                <View style={styles.statHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.statLabel}>Next Payout</Text>
                                        <Text style={[styles.statValue, { color: theme.success }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(nextProfit)}</Text>
                                    </View>
                                    <View style={[styles.statIconBox, { backgroundColor: theme.successBg }]}>
                                        <CalendarClock size={18} color={theme.success} />
                                    </View>
                                </View>
                                <View style={[styles.statBadge, { backgroundColor: theme.successBg, borderColor: theme.mode === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'transparent' }]}>
                                    <Text style={[styles.statBadgeText, { color: theme.success }]}>~{nextDate.toLocaleString('default', { month: 'short' })} 01</Text>
                                </View>
                            </View>
                        );
                    })()}

                    {/* 3. Available Profit */}
                    <View style={styles.statCard}>
                        <View style={styles.statHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.statLabel}>Avail. Profit</Text>
                                <Text style={[styles.statValue, { color: theme.warning }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(Math.floor(Math.max(0, portfolio?.availableProfit || 0)))}</Text>
                            </View>
                            <View style={[styles.statIconBox, { backgroundColor: theme.warningBg }]}>
                                <Text style={{ fontSize: 16 }}>💰</Text>
                            </View>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: theme.warningBg, borderColor: theme.mode === 'dark' ? 'rgba(251, 191, 36, 0.2)' : 'transparent' }]}>
                            <Text style={[styles.statBadgeText, { color: theme.warning }]}>Withdrawable</Text>
                        </View>
                    </View>

                    {/* 4. Current Balance */}
                    <View style={[styles.statCard, {
                        backgroundColor: theme.mode === 'light' ? theme.darkCardBg : theme.cardBg,
                        borderColor: theme.mode === 'light' ? 'transparent' : theme.cardBorder
                    }]}>
                        <View style={styles.statHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.statLabel, { color: theme.mode === 'light' ? theme.textSecondary : '#a5b4fc' }]}>Balance</Text>
                                <Text style={[styles.statValue, { color: theme.mode === 'light' ? theme.darkCardText : theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(Math.floor((portfolio?.totalInvested || 0) + (portfolio?.availableProfit || 0)))}</Text>
                            </View>
                            <View style={[styles.statIconBox, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                <Text style={{ fontSize: 16 }}>💸</Text>
                            </View>
                        </View>
                        <View style={[styles.statBadge, { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'transparent' }]}>
                            <Text style={[styles.statBadgeText, { color: '#e2e8f0' }]}>Usable</Text>
                        </View>
                    </View>

                </View>

                {/* Profit Calculator Section */}
                <View style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                        <TrendingUp size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>Profit Calculator</Text>
                    </View>

                    <View style={styles.calcInputs}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>Amount (₹)</Text>
                            <TextInput
                                style={styles.calcInput}
                                value={calcAmount}
                                onChangeText={setCalcAmount}
                                keyboardType="numeric"
                                placeholderTextColor={theme.textSecondary}
                            />
                        </View>
                        <View style={{ flex: 0.6 }}>
                            <Text style={styles.inputLabel}>Months</Text>
                            <View style={styles.durationInputContainer}>
                                <TextInput
                                    style={[styles.calcInput, { paddingRight: 30 }]}
                                    value={calcDuration.toString()}
                                    onChangeText={(t) => setCalcDuration(t.replace(/[^0-9]/g, ''))}
                                    keyboardType="numeric"
                                    placeholderTextColor={theme.textSecondary}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.calcToggles}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, calcType === 'fixed' && styles.toggleBtnActive]}
                            onPress={() => setCalcType('fixed')}
                        >
                            <Text style={[styles.toggleText, calcType === 'fixed' && { color: '#fff' }]}>Fixed (4%)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, calcType === 'compounded' && styles.toggleBtnActiveCompounded, calcDuration <= 6 && { opacity: 0.5 }]}
                            onPress={() => calcDuration > 6 && setCalcType('compounded')}
                            disabled={calcDuration <= 6}
                        >
                            <Text style={[styles.toggleText, calcType === 'compounded' && { color: '#fff' }]}>Compounded</Text>
                        </TouchableOpacity>
                    </View>

                    {calcDuration <= 6 && <Text style={styles.helperText}>* Min 7 months for compounding</Text>}

                    <View style={styles.calcResultBox}>
                        <View style={[
                            styles.resultCard,
                            calcType === 'fixed' ? { borderColor: theme.primary, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : 'rgba(79, 70, 229, 0.1)' }
                                : { borderColor: theme.inputBorder, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }
                        ]}>
                            <Text style={styles.resultLabel}>Fixed Profit</Text>
                            <Text style={[styles.resultValue, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(calcResult.fixed.profit)}</Text>
                            <Text style={styles.resultTotal} numberOfLines={1} adjustsFontSizeToFit>Total: {formatCurrency(calcResult.fixed.finalAmount)}</Text>
                        </View>

                        <View style={[
                            styles.resultCard,
                            calcType === 'compounded' ? { borderColor: theme.success, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(22, 163, 74, 0.1)' }
                                : { borderColor: theme.inputBorder, backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc' }
                        ]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.resultLabel}>Compounded</Text>
                                {calcDuration > 6 && <TrendingUp size={12} color={theme.success} />}
                            </View>
                            <Text style={[styles.resultValue, { color: theme.success }]} numberOfLines={1} adjustsFontSizeToFit>
                                {calcDuration > 6 ? formatCurrency(calcResult.compounded.profit) : '---'}
                            </Text>
                            <Text style={[styles.resultTotal, { color: theme.success }]} numberOfLines={1} adjustsFontSizeToFit>
                                {calcDuration > 6 ? `Total: ${formatCurrency(calcResult.compounded.finalAmount)}` : 'Min 7M'}
                            </Text>
                        </View>
                    </View>
                </View>




                {/* Profit Configuration Card - Read Only */}
                <View style={[styles.card, { marginTop: 16 }]}>
                    <View style={styles.cardHeaderRow}>
                        <TrendingUp size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>Current Profit Plan</Text>
                    </View>

                    <View style={{ marginTop: 16 }}>
                        <View style={styles.configItemRow}>
                            <View>
                                <Text style={styles.configLabel}>Profit Mode</Text>
                                <Text style={styles.configSub}>How your profit is calculated</Text>
                            </View>
                            <View style={[styles.modeBadge, {
                                backgroundColor: portfolio?.profitMode === 'COMPOUNDING' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                borderColor: portfolio?.profitMode === 'COMPOUNDING' ? theme.primary : theme.success
                            }]}>
                                <Text style={[styles.modeBadgeText, {
                                    color: portfolio?.profitMode === 'COMPOUNDING' ? theme.primary : theme.success
                                }]}>
                                    {portfolio?.profitMode === 'COMPOUNDING' ? 'COMPOUNDING' : 'FIXED MONTHLY'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.configItemRow}>
                            <View>
                                <Text style={styles.configLabel}>Monthly Rate</Text>
                                <Text style={styles.configSub}>Applied on invested capital</Text>
                            </View>
                            <Text style={styles.rateValue}>{portfolio?.profitPercentage || 0}%</Text>
                        </View>

                        {/* Only show if relevant or explicitly true */}
                        {portfolio?.isProrationEnabled === true && (
                            <>
                                <View style={styles.divider} />
                                <View style={styles.configItemRow}>
                                    <View>
                                        <Text style={styles.configLabel}>1st Month Partial</Text>
                                        <Text style={styles.configSub}>Prorated profit for join month</Text>
                                    </View>
                                    <Check size={18} color={theme.success} />
                                </View>
                            </>
                        )}

                        {portfolio?.profitModeEffectiveDate && (
                            <View style={styles.infoBox}>
                                <Clock size={12} color={theme.textSecondary} />
                                <Text style={styles.infoBoxText}>
                                    Active since: {portfolio.profitModeEffectiveDate}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Profit Summary & History */}
                <View
                    style={[styles.card, { marginTop: 16 }]}
                    onLayout={(e) => storeSectionY('profit', e)}
                >
                    <View style={styles.cardHeaderRow}>
                        <Calendar size={20} color={theme.primary} />
                        <Text style={styles.cardTitle}>Profit Summary</Text>
                    </View>

                    {/* Total Profit with Year Filter */}
                    <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardLabel}>TOTAL NET PROFIT (TILL DATE)</Text>
                            <Text style={[styles.moneyMedium, { color: theme.success }]}>
                                {formatCurrency(totalNetProfit)}
                            </Text>
                        </View>

                        {/* Year Filter Button */}
                        {availableProfitYears.length > 1 && (
                            <View style={{ position: 'relative', zIndex: 1000 }}>
                                <TouchableOpacity
                                    style={styles.yearFilterBtn}
                                    onPress={() => setShowProfitYearFilter(!showProfitYearFilter)}
                                >
                                    <Text style={styles.yearFilterText}>{selectedProfitYear}</Text>
                                    <ChevronDown size={14} color={theme.primary} />
                                </TouchableOpacity>

                                {/* Year Filter Dropdown - Absolutely Positioned Popup */}
                                {showProfitYearFilter && (
                                    <View style={styles.yearFilterDropdown}>
                                        {availableProfitYears.map((year) => (
                                            <TouchableOpacity
                                                key={year}
                                                style={[
                                                    styles.yearFilterOption,
                                                    selectedProfitYear === year && styles.yearFilterOptionActive
                                                ]}
                                                onPress={() => {
                                                    setSelectedProfitYear(year);
                                                    setShowProfitYearFilter(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.yearFilterOptionText,
                                                    selectedProfitYear === year && { color: theme.primary, fontWeight: '700' }
                                                ]}>
                                                    {year}
                                                </Text>
                                                {selectedProfitYear === year && <View style={styles.activeDot} />}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {filteredProfitHistory.length > 0 ? (
                        <>
                            <Text style={[styles.cardLabel, { marginBottom: 12 }]}>MONTHLY BREAKDOWN</Text>
                            <View style={{ minHeight: 200 }}>
                                {paginatedProfitHistory.map((item, index) => {
                                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                    const monthName = item.month ? monthNames[item.month - 1] : null;

                                    // Format date as dd/mm/yyyy hh:mm
                                    let displayDate = null;
                                    if (item.calculatedAt) {
                                        const date = new Date(item.calculatedAt);
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const year = date.getFullYear();
                                        const hours = String(date.getHours()).padStart(2, '0');
                                        const minutes = String(date.getMinutes()).padStart(2, '0');
                                        displayDate = `${day}/${month}/${year} ${hours}:${minutes}`;
                                    }

                                    return (
                                        <View
                                            key={index}
                                            style={[
                                                styles.profitHistoryItem,
                                                index === paginatedProfitHistory.length - 1 && { borderBottomWidth: 0 }
                                            ]}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
                                                {/* Month/Year Badge */}
                                                <View style={styles.profitMonthBadge}>
                                                    <Text style={styles.profitMonthText}>
                                                        {monthName || (item.calculatedAt ? monthNames[new Date(item.calculatedAt).getMonth()] : 'N/A')}
                                                    </Text>
                                                    <Text style={styles.profitYearText}>
                                                        {item.year || (item.calculatedAt ? new Date(item.calculatedAt).getFullYear() : '')}
                                                    </Text>
                                                </View>

                                                {/* Details */}
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.profitEntryTitle}>
                                                        Monthly Profit
                                                    </Text>
                                                    <Text style={styles.profitEntryDate}>
                                                        {displayDate || (monthName && item.year ? `${monthName} ${item.year}` : 'Profit Entry')}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Amount & Percentage */}
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.profitEntryAmount}>
                                                    +{formatCurrency(item.profitAmount || item.amount)}
                                                </Text>
                                                {item.profitPercentage && (
                                                    <View style={styles.profitPercentageBadge}>
                                                        <Text style={styles.profitPercentageText}>
                                                            {item.profitPercentage}%
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            {totalProfitPages > 1 && (
                                <View style={[styles.paginationRow, { marginTop: 8, paddingHorizontal: 4, backgroundColor: 'transparent' }]}>
                                    <TouchableOpacity
                                        style={[styles.paginationBtn, profitPageHistory === 1 && { opacity: 0.5 }]}
                                        disabled={profitPageHistory === 1}
                                        onPress={() => setProfitPageHistory(p => Math.max(1, p - 1))}
                                    >
                                        <Text style={styles.paginationBtnText}>Previous</Text>
                                    </TouchableOpacity>

                                    <Text style={styles.pageIndicatorText}>
                                        Page {profitPageHistory} of {totalProfitPages}
                                    </Text>

                                    <TouchableOpacity
                                        style={[styles.paginationBtn, profitPageHistory === totalProfitPages && { opacity: 0.5 }]}
                                        disabled={profitPageHistory === totalProfitPages}
                                        onPress={() => setProfitPageHistory(p => Math.min(totalProfitPages, p + 1))}
                                    >
                                        <Text style={styles.paginationBtnText}>Next</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyProfitState}>
                            <TrendingUp size={32} color={theme.textSecondary} opacity={0.3} />
                            <Text style={styles.emptyText}>No profit history yet.</Text>
                            <Text style={[styles.emptyText, { fontSize: 11, marginTop: 4 }]}>
                                Your monthly profits will appear here
                            </Text>
                        </View>
                    )}
                </View>

                {/* Transaction History Section */}
                <View
                    style={[styles.card, { marginTop: 16, padding: 0 }]}
                    onLayout={(e) => storeSectionY('history', e)}
                >
                    <View style={styles.sectionHeaderBox}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <History size={20} color={theme.primary} />
                            <Text style={styles.cardTitle}>History</Text>
                        </View>

                        <View style={{ position: 'relative', zIndex: 1002 }}>
                            <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterMenu(!showFilterMenu)}>
                                <Filter size={14} color={theme.textSecondary} />
                                <Text style={styles.filterBtnText}>{filterType === 'ALL' ? 'All' : filterType}</Text>
                                <ChevronDown size={14} color={theme.textSecondary} />
                            </TouchableOpacity>

                            {showFilterMenu && (
                                <View style={styles.filterMenu}>
                                    {['ALL', 'DEPOSIT', 'WITHDRAWAL', 'PAYOUT'].map(type => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.filterOption, filterType === type && styles.filterOptionActive]}
                                            onPress={() => { setFilterType(type); setShowFilterMenu(false); }}
                                        >
                                            <Text style={[styles.filterOptionText, filterType === type && { color: theme.primary }]}>
                                                {type === 'ALL' ? 'All Transactions' : type}
                                            </Text>
                                            {filterType === type && <View style={styles.activeDot} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={styles.historyList}>
                        {paginatedHistory.length === 0 ? (
                            <Text style={styles.emptyText}>No transactions found.</Text>
                        ) : (
                            <React.Fragment>
                                {paginatedHistory.map((item, index) => (
                                    <View key={index} style={[
                                        styles.transactionItem,
                                        index === paginatedHistory.filter(item => item.type !== 'PROFIT').length - 1 && { borderBottomWidth: 0 }
                                    ]}>
                                        <View style={[styles.transIconBox, {
                                            backgroundColor: item.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' :
                                                item.type === 'WITHDRAWAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'
                                        }]}>
                                            {item.type === 'DEPOSIT' ? <ArrowUpRight size={16} color={theme.success} /> :
                                                item.type === 'WITHDRAWAL' ? <ArrowDownLeft size={16} color={theme.error} /> :
                                                    <Banknote size={16} color={theme.primary} />}
                                        </View>
                                        <View style={{ flex: 1, paddingHorizontal: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Text style={styles.transType}>{item.label || item.type}</Text>
                                                {item.type === 'PAYOUT' && (
                                                    <TouchableOpacity
                                                        onPress={() => { setSelectedPayout(item); setModalVisible(true); }}
                                                        style={styles.eyeBtn}
                                                    >
                                                        <Eye size={14} color={theme.primary} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <Text style={styles.transDate}>
                                                {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', flex: 0.6 }}>
                                            <Text style={[styles.transAmount, { color: theme.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>
                                                {item.type === 'DEPOSIT' || item.type === 'PAYOUT' ? '+' : '-'}
                                                {formatCurrency(item.amount)}
                                            </Text>
                                            <View style={[styles.statusBadge, {
                                                borderColor: item.status === 'ADMIN' ? '#3b82f6' :
                                                    (item.status === 'APPROVED' || item.status === 'COMPLETED' ? theme.success :
                                                        item.status === 'REJECTED' ? theme.error : theme.warning)
                                            }]}>
                                                <Text
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit
                                                    style={[styles.statusText, {
                                                        color: item.status === 'ADMIN' ? '#3b82f6' :
                                                            (item.status === 'APPROVED' || item.status === 'COMPLETED' ? theme.success :
                                                                item.status === 'REJECTED' ? theme.error : theme.warning)
                                                    }]}
                                                >
                                                    {item.status}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}

                                {totalHistoryPages > 1 && (
                                    <View style={styles.paginationRow}>
                                        <TouchableOpacity
                                            style={[styles.paginationBtn, historyPage === 1 && { opacity: 0.5 }]}
                                            disabled={historyPage === 1}
                                            onPress={() => setHistoryPage(p => Math.max(1, p - 1))}
                                        >
                                            <Text style={styles.paginationBtnText}>Previous</Text>
                                        </TouchableOpacity>

                                        <Text style={styles.pageIndicatorText}>
                                            Page {historyPage} of {totalHistoryPages}
                                        </Text>

                                        <TouchableOpacity
                                            style={[styles.paginationBtn, historyPage === totalHistoryPages && { opacity: 0.5 }]}
                                            disabled={historyPage === totalHistoryPages}
                                            onPress={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                                        >
                                            <Text style={styles.paginationBtnText}>Next</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </React.Fragment>
                        )}
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Payout Details Modal */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>PAYOUT DETAILS</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                <X size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 500 }}>
                            {/* Meta Data Section */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20 }}>
                                <View style={styles.idBadge}>
                                    <Text style={styles.idText}>#{selectedPayout?.id}</Text>
                                </View>
                                <View style={[styles.statusBadge, {
                                    paddingVertical: 2, paddingHorizontal: 6, marginLeft: 'auto', borderWidth: 1, borderColor: theme.cardBorder
                                }]}>
                                    <Text style={[styles.statusText, { color: selectedPayout?.status === 'APPROVED' || selectedPayout?.status === 'COMPLETED' ? theme.success : selectedPayout?.status === 'REJECTED' ? theme.error : theme.warning }]}>
                                        {selectedPayout?.status}
                                    </Text>
                                </View>
                            </View>
                            {/* Proof Image */}
                            <View style={styles.proofSection}>
                                <Text style={styles.sectionTitle}>PROOF OF PAYMENT</Text>
                                <TouchableOpacity
                                    style={styles.imageContainer}
                                    onPress={() => (selectedPayout?.screenshot || selectedPayout?.screenshotPath || selectedPayout?.proof) && setFullImageModalVisible(true)}
                                    activeOpacity={0.9}
                                >
                                    {selectedPayout && (selectedPayout.screenshotPath || selectedPayout.screenshot || selectedPayout.proof) ? (
                                        <Image
                                            source={{ uri: getImageUrl(selectedPayout.screenshotPath || selectedPayout.screenshot || selectedPayout.proof) }}
                                            style={{ width: '100%', height: '100%' }}
                                            resizeMode="contain"
                                        />
                                    ) : (
                                        <View style={styles.noImage}>
                                            <ImageIcon size={32} color={theme.textSecondary} />
                                            <Text style={styles.noImageText}>No screenshot provided</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* Settlement Narrative Section */}
                            <View style={styles.messageSection}>
                                <View style={styles.sectionHeaderRow}>
                                    <View style={styles.iconCircleMini}>
                                        <FileText size={12} color={theme.primary} />
                                    </View>
                                    <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>SETTLEMENT NARRATIVE</Text>
                                    <Text style={[styles.dateText, { fontSize: 10, opacity: 0.6, marginLeft: 'auto' }]}>
                                        {selectedPayout && new Date(selectedPayout.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.premiumNarrativeBox}>
                                    {(selectedPayout?.messageContent || selectedPayout?.notes) && (
                                        <TouchableOpacity
                                            onPress={() => handleCopy(selectedPayout.messageContent || selectedPayout.notes)}
                                            style={styles.modalCopyBtnInside}
                                        >
                                            {copied ? <Check size={16} color={theme.success} /> : <Copy size={16} color={theme.primary} />}
                                        </TouchableOpacity>
                                    )}
                                    <Text style={styles.premiumNarrativeText}>
                                        {selectedPayout?.messageContent || selectedPayout?.notes || selectedPayout?.description || "No additional settlement details provided."}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Full Screen Image Modal */}
            < Modal visible={fullImageModalVisible} transparent={true} animationType="fade" onRequestClose={() => setFullImageModalVisible(false)
            }>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
                    <TouchableOpacity
                        style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }}
                        onPress={() => setFullImageModalVisible(false)}
                    >
                        <X size={28} color="#fff" />
                    </TouchableOpacity>

                    {selectedPayout && (
                        <Image
                            source={{ uri: selectedPayout.screenshotPath || selectedPayout.screenshot || selectedPayout.proof }}
                            style={{ width: '100%', height: '90%' }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal >



            {/* Mobile Sidebar */}
            {
                mobileMenuOpen && (
                    <TouchableOpacity
                        style={styles.overlay}
                        activeOpacity={1}
                        onPress={toggleSidebar}
                    >
                        <View />
                    </TouchableOpacity>
                )
            }

            <Animated.View style={[styles.sidebar, { transform: [{ translateX: slideAnim }] }]}>
                <View style={styles.sidebarHeader}>
                    <Text style={styles.sidebarTitle}>MVK<Text style={{ color: theme.primary }}>Traders</Text></Text>
                </View>

                <TouchableOpacity style={styles.sidebarItem} onPress={() => toggleSidebar('top')}>
                    <AlignLeft size={20} color={theme.primary} />
                    <Text style={[styles.sidebarText, { color: theme.textPrimary }]}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarItem} onPress={() => toggleSidebar('profit')}>
                    <Wallet size={20} color={theme.textSecondary} />
                    <Text style={styles.sidebarText}>Portfolio</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sidebarItem} onPress={() => toggleSidebar('history')}>
                    <History size={20} color={theme.textSecondary} />
                    <Text style={styles.sidebarText}>History</Text>
                </TouchableOpacity>

            </Animated.View>

        </SafeAreaView >
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { justifyContent: 'center', alignItems: 'center' },

    // Header & Base
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, zIndex: 20 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { padding: 8, borderRadius: 12, backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff', borderWidth: 1, borderColor: theme.mode === 'dark' ? 'transparent' : theme.cardBorder },
    headerTextContainer: { justifyContent: 'center' },
    headerGreeting: { fontSize: 16, fontWeight: '700', color: theme.headerText, letterSpacing: 0.5 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },

    notificationBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.6)' : '#fff', borderWidth: 1, borderColor: theme.cardBorder, justifyContent: 'center', alignItems: 'center' },
    badgeDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: theme.error, borderWidth: 2, borderColor: theme.background },
    profileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder },
    profileInitial: { color: '#fff', fontWeight: '700', fontSize: 16 },

    scrollContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8, zIndex: 1 },
    pageSubtitle: { color: theme.textSecondary, fontSize: 13, marginBottom: 16, fontWeight: '500' },

    // Actions
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, borderRadius: 12, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    actionText: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },

    // Card Styles (Base)
    card: { backgroundColor: theme.cardBg, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, letterSpacing: 0.3 },
    cardLabel: { fontSize: 10, color: theme.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },

    // Stats Grid
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
    statCard: { width: '48%', backgroundColor: theme.cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    statHeader: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    statLabel: { fontSize: 10, color: theme.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
    statValue: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: -0.5 },
    statIconBox: { padding: 6, borderRadius: 8 },
    statBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    statBadgeText: { fontSize: 10, fontWeight: '600' },

    // Logic
    calcInputs: { flexDirection: 'row', gap: 12 },
    inputLabel: { fontSize: 12, color: theme.textSecondary, marginBottom: 6, fontWeight: '500' },
    calcInput: { backgroundColor: theme.inputBackground, borderWidth: 1, borderColor: theme.inputBorder, padding: 12, borderRadius: 10, color: theme.textPrimary, fontSize: 14, fontWeight: '500' },
    durationInputContainer: { position: 'relative' },

    calcToggles: { flexDirection: 'row', gap: 8, marginTop: 16, backgroundColor: theme.background, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder },
    toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 4 },
    toggleBtnActiveCompounded: { backgroundColor: theme.success, shadowColor: theme.success, shadowOpacity: 0.3, shadowRadius: 4 },
    toggleText: { fontSize: 12, color: theme.textSecondary, fontWeight: '600' },
    helperText: { fontSize: 11, color: theme.error, marginTop: 6, textAlign: 'right', fontWeight: '500' },

    calcResultBox: { flexDirection: 'row', gap: 10, marginTop: 16 },
    resultCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1 },
    resultLabel: { fontSize: 11, color: theme.textSecondary, marginBottom: 4, opacity: 0.8 },
    resultValue: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    resultTotal: { fontSize: 11, color: theme.primary, marginTop: 4, fontWeight: '600' },

    historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    historyText: { color: theme.textSecondary, fontSize: 13, fontWeight: '500' },
    historyAmount: { color: theme.success, fontSize: 13, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    moneyMedium: { fontSize: 24, fontWeight: '700', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

    // Profit History Items
    profitHistoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
    },
    profitMonthBadge: {
        width: 60,
        height: 60,
        borderRadius: 16,
        // In dark mode, use a deeper background than the card to create "inset" depth
        backgroundColor: theme.mode === 'dark' ? '#0F172A' : '#FFFFFF',
        borderWidth: 1.5,
        // Thicker, more vibrant border for dark mode
        borderColor: theme.mode === 'dark' ? theme.primary : theme.primary + '25',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.1,
        shadowRadius: 8,
        elevation: 6,
    },
    profitMonthText: {
        fontSize: 15,
        fontWeight: '900', // Extra bold for month
        // Use White in dark mode for maximum "pop"
        color: theme.mode === 'dark' ? '#FFFFFF' : theme.primary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    profitYearText: {
        fontSize: 11,
        fontWeight: '700',
        // Year text is primary color in dark mode for style
        color: theme.mode === 'dark' ? theme.primary : theme.textSecondary,
        marginTop: 1,
    },
    profitEntryTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.textPrimary,
        marginBottom: 4,
    },
    profitEntryDate: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.textSecondary,
        opacity: 0.8,
    },
    profitEntryAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.success,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 4,
    },
    profitPercentageBadge: {
        backgroundColor: theme.success + '15',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: theme.success + '30',
    },
    profitPercentageText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.success,
        letterSpacing: 0.3,
    },
    emptyProfitState: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 8,
    },

    // Year Filter Styles
    yearFilterBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.primaryBg,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.primary + '30',
        marginTop: 4,
    },
    yearFilterText: {
        color: theme.primary,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    yearFilterDropdown: {
        position: 'absolute',
        top: 42,
        right: 0,
        minWidth: 120,
        backgroundColor: theme.modalBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        overflow: 'hidden',
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 1001,
    },
    yearFilterOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
    },
    yearFilterOptionActive: {
        backgroundColor: theme.primaryBg,
    },
    yearFilterOptionText: {
        color: theme.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },

    divider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 16 },

    // Transaction History Section
    sectionHeaderBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 16, paddingHorizontal: 16 },
    filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.cardBg, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder },
    filterBtnText: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },

    filterMenu: {
        position: 'absolute',
        top: 40,
        right: 0,
        minWidth: 150,
        backgroundColor: theme.modalBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        overflow: 'hidden',
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 1003
    },
    filterOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    filterOptionActive: { backgroundColor: theme.primaryBg },
    filterOptionText: { color: theme.textSecondary, fontSize: 13, fontWeight: '500' },
    activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },

    historyList: { backgroundColor: theme.cardBg, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder },
    transactionItem: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, alignItems: 'center' },
    transIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    transType: { color: theme.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 2 },
    transDate: { color: theme.textSecondary, fontSize: 11, fontWeight: '500' },
    transNote: { color: theme.textSecondary, fontSize: 10, marginTop: 2, fontStyle: 'italic', opacity: 0.8 },
    transAmount: { color: theme.textPrimary, fontWeight: '700', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-end' },
    statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalContent: { width: '100%', backgroundColor: theme.modalBg, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
    modalHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.modalBg },
    modalTitle: { color: theme.headerText, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    idBadge: { backgroundColor: theme.primaryBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
    idText: { color: theme.primary, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
    dateText: { color: theme.textSecondary, fontSize: 11 },
    closeBtn: { padding: 6, backgroundColor: theme.background, borderRadius: 20 },

    proofSection: { padding: 20, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    sectionTitle: { fontSize: 11, color: theme.textSecondary, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
    imageContainer: { height: 200, backgroundColor: theme.background, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder, justifyContent: 'center', alignItems: 'center' },
    noImage: { alignItems: 'center', gap: 10 },
    noImageText: { color: theme.textSecondary, fontSize: 12, fontWeight: '500' },

    messageSection: { padding: 20 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    iconCircleMini: { width: 28, height: 28, borderRadius: 10, backgroundColor: theme.primary + '15', justifyContent: 'center', alignItems: 'center' },
    premiumNarrativeBox: {
        backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
        padding: 16,
        paddingTop: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        position: 'relative'
    },
    modalCopyBtnInside: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 8,
        backgroundColor: theme.primary + '15',
        borderRadius: 8,
        zIndex: 10
    },
    premiumNarrativeText: {
        color: theme.textPrimary,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        opacity: 0.9
    },

    eyeBtn: { padding: 4, backgroundColor: theme.primaryBg, borderRadius: 6, marginLeft: 6 },

    // Shared / Others
    emptyText: { color: theme.textSecondary, textAlign: 'center', padding: 24, fontStyle: 'italic' },

    notificationsDropdown: { position: 'absolute', top: 100, left: 16, right: 16, backgroundColor: theme.modalBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 16, zIndex: 50, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 15, maxHeight: 350 },

    dropdownHeader: { padding: 12, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dropdownTitle: { color: theme.headerText, fontWeight: '700', fontSize: 14 },
    newBadge: { backgroundColor: theme.primaryBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    newBadgeText: { color: theme.primary, fontSize: 10, fontWeight: '700' },

    notificationItem: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, alignItems: 'flex-start', gap: 10 },
    notifIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    notifTitle: { color: theme.textPrimary, fontWeight: '600', fontSize: 13, marginBottom: 2 },
    notifDate: { fontSize: 10, color: theme.textSecondary },
    notifBody: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },

    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 10 },
    menuItemText: { color: theme.textSecondary, fontSize: 14, fontWeight: '500' },
    menuDivider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 4 },

    overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: theme.overlay, zIndex: 90 },
    sidebar: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 260, backgroundColor: theme.sidebarBg, padding: 20, zIndex: 100, borderRightWidth: 1, borderRightColor: theme.sidebarBorder, shadowColor: theme.shadowColor, shadowOffset: { width: 8, height: 0 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 20 },
    sidebarHeader: { marginBottom: 32, paddingTop: 32, paddingLeft: 4 },
    sidebarTitle: { color: theme.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10 },
    sidebarText: { color: theme.textSecondary, fontSize: 15, fontWeight: '500' },

    // Profit Config Card Styles
    configItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    configLabel: { fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 },
    configSub: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },
    modeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    modeBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    rateValue: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    infoBox: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.background, padding: 8, borderRadius: 8 },
    infoBoxText: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },

    // Pagination Styles
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        backgroundColor: theme.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#fcfcfc',
        borderTopWidth: 1,
        borderTopColor: theme.cardBorder,
    },
    paginationBtn: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: theme.primaryBg,
        borderWidth: 1,
        borderColor: theme.primary + '30',
    },
    paginationBtnText: {
        color: theme.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    pageIndicatorText: {
        color: theme.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
});
