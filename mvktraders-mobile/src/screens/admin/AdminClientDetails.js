import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Image,
    Platform,
    StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import {
    ArrowLeft,
    Wallet,
    TrendingUp,
    History,
    UserCheck,
    Shield,
    Send,
    Image as ImageIcon,
    X,
    Trash,
    Lock,
    Plus,
    ArrowDown,
    Calendar,
    ChevronRight,
    Search,
    UserPlus,
    XCircle,
    CheckCircle,
    Clock,
    FileText,
    Filter,
    ChevronDown
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminClientDetails({ route, navigation }) {
    const { clientId, clientName } = route.params;
    const { login, setSession } = useAuth();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => getStyles(theme, isDark), [theme, isDark]);

    const [portfolio, setPortfolio] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Payout Modal
    const [payoutVisible, setPayoutVisible] = useState(false);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutDate, setPayoutDate] = useState('');
    const [payoutImage, setPayoutImage] = useState(null);
    const [payoutLoading, setPayoutLoading] = useState(false);

    // Fund Management Modal (Add Funds / Withdraw)
    const [fundModalVisible, setFundModalVisible] = useState(false);
    const [fundType, setFundType] = useState('DEPOSIT');
    const [fundAmount, setFundAmount] = useState('');
    const [fundNote, setFundNote] = useState('');
    const [fundLoading, setFundLoading] = useState(false);

    // Profit Config State
    const [profitMode, setProfitMode] = useState('FIXED');
    const [profitPercentage, setProfitPercentage] = useState('');
    const [isProrationEnabled, setIsProrationEnabled] = useState(true);
    const [allowEarlyExit, setAllowEarlyExit] = useState(false);
    const [profitEffectiveDate, setProfitEffectiveDate] = useState(null);
    const [savingProfit, setSavingProfit] = useState(false);

    const handleSaveProfitConfig = async () => {
        Alert.alert('Confirm Update', 'This will affect future profit calculations only. Past profits will not be changed.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Confirm Save', onPress: async () => {
                    try {
                        setSavingProfit(true);
                        await adminService.updateClientProfitConfig(clientId, {
                            profitMode,
                            profitPercentage: parseFloat(profitPercentage) || 0,
                            isProrationEnabled,
                            allowEarlyExit
                        });
                        Alert.alert('Success', 'Profit configuration updated.');
                        loadData(false);
                    } catch (e) {
                        const errorMsg = e.response?.data?.message || e.message || 'Update failed';
                        Alert.alert('Error', errorMsg);
                    }
                    finally { setSavingProfit(false); }
                }
            }
        ]);
    };

    // Filter
    const [filterType, setFilterType] = useState('ALL');
    const [filterVisible, setFilterVisible] = useState(false);

    const filteredTransactions = useMemo(() => {
        if (filterType === 'ALL') return transactions;
        return transactions.filter(t => t.type === filterType);
    }, [transactions, filterType]);

    const loadData = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [portRes, transRes] = await Promise.all([
                adminService.getClientPortfolio(clientId),
                adminService.getClientTransactions(clientId)
            ]);
            setPortfolio(portRes);
            setTransactions(transRes);

            // Set Profit Config
            setProfitMode(portRes.profitMode || 'FIXED');
            setProfitPercentage(portRes.profitPercentage ? String(portRes.profitPercentage) : '0');
            setIsProrationEnabled(portRes.isProrationEnabled !== false);
            setAllowEarlyExit(portRes.allowEarlyExit === true);
            setProfitEffectiveDate(portRes.profitModeEffectiveDate);
        } catch (error) {
            console.error('Error loading client details:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to load client details';
            Alert.alert('Error', errorMessage);
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

    const handleImpersonate = async () => {
        Alert.alert(
            'Impersonate User',
            `You are about to log in as ${clientName}. This will switch your session immediately.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    style: 'default',
                    onPress: async () => {
                        try {
                            const res = await adminService.impersonateUser(clientId);
                            const success = await setSession(res.access_token, res.refresh_token);
                            if (success) {
                                // navigation.replace('ClientDashboard'); // Navigate if needed, but context update might trigger re-render
                            } else {
                                Alert.alert('Error', 'Failed to establish session');
                            }
                        } catch (e) {
                            console.error("Impersonation failed", e);
                            Alert.alert('Error', 'Impersonation failed');
                        }
                    }
                }
            ]
        );
    };

    const handleDeactivate = async () => {
        Alert.alert(
            'Deactivate User',
            `Are you sure you want to deactivate ${clientName}'s account? They will lose access immediately, but their data will be preserved.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Deactivate Account',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminService.deleteUser(clientId);
                            Alert.alert('Success', 'User deactivated successfully');
                            loadData(false);
                        } catch (e) {
                            const errorMsg = e.response?.data?.message || e.message || 'Unknown error';
                            Alert.alert('Error', 'Failed to deactivate user: ' + errorMsg);
                        }
                    }
                }
            ]
        );
    };

    const handleReactivate = async () => {
        Alert.alert(
            'Activate Account',
            `Are you sure you want to reactivate ${clientName}'s account?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Activate',
                    style: 'default',
                    onPress: async () => {
                        try {
                            await adminService.reactivateUser(clientId);
                            Alert.alert('Success', 'Account reactivated successfully');
                            loadData(false);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to reactivate user');
                        }
                    }
                }
            ]
        );
    };

    const handlePermanentDelete = async () => {
        Alert.alert(
            'Delete Permanently',
            `This will permanently remove ${clientName} and all their records from the database. This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await adminService.deleteUserPermanently(clientId);
                            Alert.alert('Success', 'User deleted permanently');
                            navigation.goBack();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete user permanently');
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setPayoutImage(result.assets[0]);
        }
    };

    const handlePayoutSubmit = async () => {
        if (!payoutAmount || !payoutImage) {
            Alert.alert('Error', 'Please provide amount and screenshot');
            return;
        }

        setPayoutLoading(true);
        try {
            const formData = new FormData();
            formData.append('userId', clientId);
            formData.append('amount', payoutAmount);
            formData.append('message', `Payout for ${payoutDate || new Date().toLocaleDateString()}`);

            const uri = Platform.OS === 'android' ? payoutImage.uri : payoutImage.uri.replace('file://', '');
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('screenshot', { uri, name: filename, type });

            await adminService.createPayout(formData);
            Alert.alert('Success', 'Payout recorded successfully');
            setPayoutVisible(false);
            setPayoutAmount('');
            setPayoutDate('');
            setPayoutImage(null);
            loadData(false);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Payout failed');
        } finally {
            setPayoutLoading(false);
        }
    };

    const handleFundSubmit = async () => {
        if (!fundAmount) {
            Alert.alert('Error', 'Please provide an amount');
            return;
        }

        setFundLoading(true);
        try {
            await adminService.createManualTransaction(clientId, {
                amount: parseFloat(fundAmount),
                type: fundType,
                note: fundNote || `Admin ${fundType.toLowerCase()} adjustment`
            });
            Alert.alert('Success', `${fundType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} successful`);
            setFundModalVisible(false);
            setFundAmount('');
            setFundNote('');
            loadData(false);
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Transaction failed');
        } finally {
            setFundLoading(false);
        }
    };

    const openFundModal = (type) => {
        setFundType(type);
        setFundModalVisible(true);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading client profile...</Text>
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
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{clientName}</Text>
                    <View style={styles.statusDot} />
                </View>
                <View style={styles.headerRightActions}>
                    {portfolio?.user?.status === 'ACTIVE' && (
                        <TouchableOpacity onPress={handleDeactivate} style={styles.deactivateHeaderBtn}>
                            <Text style={styles.deactivateHeaderText}>Deactivate</Text>
                        </TouchableOpacity>
                    )}
                    {portfolio?.user?.status === 'INACTIVE' && (
                        <TouchableOpacity onPress={handlePermanentDelete} style={styles.deactivateHeaderBtn}>
                            <Text style={styles.deactivateHeaderText}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {/* Stats Grid */}
                <View style={styles.statsCard}>
                    <LinearGradient
                        colors={isDark ? ['#1e1b4b', '#1e1b4b'] : ['#f8fafc', '#f1f5f9']}
                        style={StyleSheet.absoluteFill}
                        borderRadius={24}
                    />
                    <View style={styles.statsHeader}>
                        <View style={styles.statsIconBox}>
                            <Wallet size={20} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statsTitleText}>PORTFOLIO SUMMARY</Text>
                            {portfolio?.user?.status === 'INACTIVE' && (
                                <Text style={[styles.statsTitleText, { color: theme.error, marginTop: 2 }]}>ACCOUNT DEACTIVATED</Text>
                            )}
                        </View>
                        {portfolio?.user?.status === 'INACTIVE' && (
                            <View style={[styles.statusTag, { backgroundColor: theme.error + '15' }]}>
                                <Text style={[styles.statusTagText, { color: theme.error }]}>INACTIVE</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.statsMainGrid}>
                        <View style={styles.statsMainItem}>
                            <Text style={styles.statsMainLabel}>Total Invested</Text>
                            <Text style={styles.statsMainValue}>{formatCurrency(portfolio?.totalInvested || 0)}</Text>
                        </View>
                        <View style={styles.statsMainItem}>
                            <Text style={styles.statsMainLabel}>Current Value</Text>
                            <Text style={[styles.statsMainValue, { color: theme.primary }]}>{formatCurrency(portfolio?.totalValue || 0)}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.statsSubGrid}>
                        <View style={styles.statsSubItem}>
                            <Text style={styles.statsSubLabel}>Available Profit</Text>
                            <Text style={[styles.statsSubValue, { color: theme.success }]}>{formatCurrency(portfolio?.availableProfit || 0)}</Text>
                        </View>
                        <View style={styles.statsSubItem}>
                            <Text style={styles.statsSubLabel}>All Time GOP</Text>
                            <View style={styles.profitPercentRow}>
                                <TrendingUp size={14} color={theme.success} />
                                <Text style={[styles.statsSubValue, { color: theme.success }]}>{portfolio?.profitPercentage || 0}%</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={[
                                styles.quickActionBtn,
                                { backgroundColor: theme.success + '12' },
                                portfolio?.user?.status === 'INACTIVE' && styles.quickActionBtnDisabled
                            ]}
                            onPress={() => openFundModal('DEPOSIT')}
                            disabled={portfolio?.user?.status === 'INACTIVE'}
                        >
                            <Plus size={16} color={portfolio?.user?.status === 'INACTIVE' ? theme.textSecondary : theme.success} />
                            <Text style={[styles.quickActionBtnText, { color: portfolio?.user?.status === 'INACTIVE' ? theme.textSecondary : theme.success }]}>Add Funds</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.quickActionBtn,
                                { backgroundColor: theme.error + '12' },
                                portfolio?.user?.status === 'INACTIVE' && styles.quickActionBtnDisabled
                            ]}
                            onPress={() => openFundModal('WITHDRAWAL')}
                            disabled={portfolio?.user?.status === 'INACTIVE'}
                        >
                            <ArrowDown size={16} color={portfolio?.user?.status === 'INACTIVE' ? theme.textSecondary : theme.error} />
                            <Text style={[styles.quickActionBtnText, { color: portfolio?.user?.status === 'INACTIVE' ? theme.textSecondary : theme.error }]}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </View>



                {/* Profit & Compounding Configuration */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <TrendingUp size={18} color={theme.primary} />
                        <Text style={styles.sectionTitle}>Profit & Compounding</Text>
                    </View>
                    {profitEffectiveDate && (
                        <Text style={[styles.effectiveDateText, { color: theme.textSecondary }]}>Effective: {profitEffectiveDate}</Text>
                    )}
                </View>

                <View style={styles.statsCard}>
                    <View style={styles.configRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.configLabel}>Profit Mode</Text>
                            <Text style={styles.configDesc}>Determines how future profits are applied</Text>
                        </View>
                        <View style={styles.modeToggleContainer}>
                            <TouchableOpacity
                                style={[styles.modeBtn, profitMode === 'FIXED' && { backgroundColor: theme.primary }]}
                                onPress={() => setProfitMode('FIXED')}
                            >
                                <Text style={[styles.modeBtnText, profitMode === 'FIXED' && { color: '#fff' }]}>Fixed</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modeBtn, profitMode === 'COMPOUNDING' && { backgroundColor: theme.primary }]}
                                onPress={() => setProfitMode('COMPOUNDING')}
                            >
                                <Text style={[styles.modeBtnText, profitMode === 'COMPOUNDING' && { color: '#fff' }]}>Compound</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.configLabel}>Monthly Profit %</Text>
                            <Text style={styles.configDesc}>Percentage applied for next cycle</Text>
                        </View>
                        <View style={styles.rateInputWrapper}>
                            <TextInput
                                style={[styles.rateInput, { color: theme.textPrimary }]}
                                value={profitPercentage}
                                onChangeText={setProfitPercentage}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                                placeholderTextColor={theme.textSecondary}
                            />
                            <Text style={[styles.percentSymbol, { color: theme.textSecondary }]}>%</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.configLabel}>First Month Partial Profit</Text>
                            <Text style={styles.configDesc}>Apply profit for partial first month</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setIsProrationEnabled(!isProrationEnabled)}
                            style={[styles.toggleBtn, isProrationEnabled && { backgroundColor: theme.success }, { backgroundColor: isProrationEnabled ? theme.success : theme.cardBorder }]}
                        >
                            <View style={[styles.toggleCircle, isProrationEnabled && { transform: [{ translateX: 14 }] }, { backgroundColor: '#fff' }]} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.configRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.configLabel}>Exit Permission</Text>
                            <Text style={styles.configDesc}>Allow early exit for this client</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => setAllowEarlyExit(!allowEarlyExit)}
                            style={[styles.toggleBtn, allowEarlyExit && { backgroundColor: theme.success }, { backgroundColor: allowEarlyExit ? theme.success : theme.cardBorder }]}
                        >
                            <View style={[styles.toggleCircle, allowEarlyExit && { transform: [{ translateX: 14 }] }, { backgroundColor: '#fff' }]} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveConfigBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
                        onPress={handleSaveProfitConfig}
                        disabled={savingProfit}
                    >
                        {savingProfit ? <ActivityIndicator size="small" color="#fff" /> : (
                            <Text style={styles.saveConfigText}>Save Configuration</Text>
                        )}
                    </TouchableOpacity>
                    <Text style={[styles.configFooterText, { color: theme.textSecondary }]}>Changes will apply from the next profit calculation cycle.</Text>
                </View>

                {/* Primary Actions */}
                <View style={styles.mainActionsContainer}>
                    {portfolio?.user?.status === 'INACTIVE' && (
                        <TouchableOpacity
                            style={styles.fullReactivateBtn}
                            onPress={handleReactivate}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[theme.success, theme.success + 'DD']}
                                style={styles.fullReactivateGradient}
                            >
                                <UserPlus size={20} color="#fff" />
                                <Text style={styles.fullReactivateText}>Reactivate Account</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <View style={styles.mainActionsGridRow}>
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.primaryActionBtn,
                                portfolio?.user?.status === 'INACTIVE' && styles.actionBtnLocked
                            ]}
                            onPress={() => setPayoutVisible(true)}
                            activeOpacity={0.8}
                            disabled={portfolio?.user?.status === 'INACTIVE'}
                        >
                            {portfolio?.user?.status === 'INACTIVE' ? (
                                <Lock size={18} color={theme.textSecondary} />
                            ) : (
                                <Send size={18} color="#fff" />
                            )}
                            <Text style={[
                                styles.primaryActionText,
                                portfolio?.user?.status === 'INACTIVE' && styles.lockedActionText
                            ]}>
                                {portfolio?.user?.status === 'INACTIVE' ? 'Payout Locked' : 'Payout'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.secondaryActionBtn,
                                portfolio?.user?.status === 'INACTIVE' && styles.actionBtnLocked
                            ]}
                            onPress={handleImpersonate}
                            activeOpacity={0.8}
                            disabled={portfolio?.user?.status === 'INACTIVE'}
                        >
                            {portfolio?.user?.status === 'INACTIVE' ? (
                                <Lock size={18} color={theme.textSecondary} />
                            ) : (
                                <UserCheck size={18} color={theme.primary} />
                            )}
                            <Text style={[
                                styles.secondaryActionText,
                                portfolio?.user?.status === 'INACTIVE' && styles.lockedActionText
                            ]}>
                                {portfolio?.user?.status === 'INACTIVE' ? 'Login Disabled' : 'Login'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transactions */}
                <View style={[styles.sectionHeader, { zIndex: 100 }]}>
                    <View style={styles.sectionTitleRow}>
                        <History size={18} color={theme.textPrimary} />
                        <Text style={styles.sectionTitle}>Transaction History</Text>
                    </View>

                    <View style={styles.dropdownContainer}>
                        <TouchableOpacity
                            style={styles.dropdownTrigger}
                            onPress={() => setFilterVisible(!filterVisible)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.dropdownValue}>
                                {filterType === 'ALL' ? 'All' :
                                    filterType === 'DEPOSIT' ? 'Deposits' :
                                        filterType === 'WITHDRAWAL' ? 'Withdrawals' : 'Payouts'}
                            </Text>
                            <ChevronDown size={14} color={theme.primary} />
                        </TouchableOpacity>

                        {filterVisible && (
                            <View style={styles.dropdownMenuInline}>
                                {[
                                    { label: 'All', value: 'ALL' },
                                    { label: 'Deposits', value: 'DEPOSIT' },
                                    { label: 'Withdrawals', value: 'WITHDRAWAL' },
                                    { label: 'Payouts', value: 'PAYOUT' }
                                ].map((item) => (
                                    <TouchableOpacity
                                        key={item.value}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setFilterType(item.value);
                                            setFilterVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            filterType === item.value && styles.dropdownItemTextActive
                                        ]}>
                                            {item.label}
                                        </Text>
                                        {filterType === item.value && <View style={styles.activeDotSmall} />}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                {filteredTransactions.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Clock size={40} color={theme.textSecondary} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <Text style={styles.emptyText}>No {filterType !== 'ALL' ? filterType.toLowerCase() : ''} transactions found.</Text>
                    </View>
                ) : (
                    filteredTransactions.map((t, index) => {
                        const isPositive = t.type === 'DEPOSIT' || t.type === 'PAYOUT' || t.type === 'BONUS';
                        const isWithdrawal = t.type === 'WITHDRAWAL';
                        const desc = (t.description || '').toLowerCase();
                        const isManual = !desc.includes('approved') && t.type !== 'PAYOUT';
                        const status = isManual ? 'ADMIN' : (desc.includes('approved') ? 'APPROVED' : 'COMPLETED');

                        return (
                            <View key={t.id || index} style={[styles.transCard, {
                                backgroundColor: isWithdrawal ? theme.error + '05' :
                                    (t.type === 'DEPOSIT' ? theme.success + '05' :
                                        (t.type === 'PAYOUT' ? theme.primary + '05' : theme.cardBg))
                            }]}>
                                <View style={[styles.transIconBox, {
                                    backgroundColor: isWithdrawal ? theme.error + '10' : (t.type === 'DEPOSIT' ? theme.success + '10' : theme.primary + '10')
                                }]}>
                                    {isWithdrawal ? <ArrowDown size={18} color={theme.error} /> :
                                        t.type === 'DEPOSIT' ? <Plus size={18} color={theme.success} /> :
                                            t.type === 'PAYOUT' ? <Send size={18} color={theme.success} /> :
                                                <TrendingUp size={18} color={theme.primary} />}
                                </View>

                                <View style={styles.transInfo}>
                                    <View style={styles.transTopRow}>
                                        <Text style={styles.transType}>{t.type}</Text>
                                        <Text style={[styles.transAmount, { color: isWithdrawal ? theme.error : (isPositive ? theme.success : theme.textPrimary) }]}>
                                            {isWithdrawal ? '-' : '+'}{formatCurrency(t.amount)}
                                        </Text>
                                    </View>
                                    <View style={styles.transBottomRow}>
                                        <Text style={styles.transDate}>
                                            {(() => {
                                                const d = new Date(t.date || t.createdAt || t.timestamp);
                                                if (isNaN(d.getTime())) return '---';
                                                return `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                            })()}
                                        </Text>
                                        <View style={[styles.miniStatusBadge, { borderColor: status === 'ADMIN' ? '#3b82f6' : theme.success, marginLeft: 'auto' }]}>
                                            <Text style={[styles.miniStatusText, { color: status === 'ADMIN' ? '#3b82f6' : theme.success }]}>{status}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Payout Modal */}
            <Modal visible={payoutVisible} transparent animationType="slide" onRequestClose={() => setPayoutVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.fundModalContainer}>
                        <View style={styles.fundModalHeader}>
                            <View>
                                <Text style={styles.fundModalSubtitle}>OFFICIAL PAYOUT</Text>
                                <Text style={styles.fundModalTitle}>Record Profit Payout</Text>
                            </View>
                            <TouchableOpacity onPress={() => setPayoutVisible(false)} style={styles.modalCloseBtn}>
                                <X size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.fundModalBody} showsVerticalScrollIndicator={false}>
                            {/* Massive Amount Input */}
                            <View style={styles.centeredAmountContainer}>
                                <Text style={styles.amountLabel}>PAYOUT AMOUNT</Text>
                                <View style={styles.massiveInputWrapper}>
                                    <Text style={styles.massiveCurrencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.massiveAmountInput}
                                        placeholder="0"
                                        placeholderTextColor={theme.textSecondary + '50'}
                                        keyboardType="decimal-pad"
                                        value={payoutAmount}
                                        onChangeText={setPayoutAmount}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            <View style={styles.modalInputGroup}>
                                <Text style={styles.modalInputLabel}>MONTH / REMARK</Text>
                                <View style={styles.modalInputWrapper}>
                                    <Calendar size={18} color={theme.textSecondary} />
                                    <TextInput
                                        style={styles.modalTextInput}
                                        placeholder="e.g. October 2024 Profit"
                                        placeholderTextColor={theme.textSecondary}
                                        value={payoutDate}
                                        onChangeText={setPayoutDate}
                                    />
                                </View>
                            </View>

                            <View style={styles.modalInputGroup}>
                                <Text style={styles.modalInputLabel}>TRANSACTION PROOF</Text>
                                <TouchableOpacity style={styles.imageUploader} onPress={pickImage} activeOpacity={0.7}>
                                    {payoutImage ? (
                                        <Image source={{ uri: payoutImage.uri }} style={styles.uploadPreview} resizeMode="cover" />
                                    ) : (
                                        <View style={styles.uploadPlaceholder}>
                                            <View style={styles.uploadIconCircle}>
                                                <ImageIcon size={24} color={theme.primary} />
                                            </View>
                                            <Text style={styles.uploadTitle}>Upload Screenshot</Text>
                                            <Text style={styles.uploadSub}>PNG, JPG or JPEG allowed</Text>
                                        </View>
                                    )}
                                    {payoutImage && (
                                        <View style={styles.uploadBadge}>
                                            <Text style={styles.uploadBadgeText}>Tap to change</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.payoutSubmitBtn, (payoutLoading || !payoutAmount || !payoutImage) && { opacity: 0.5 }]}
                                onPress={handlePayoutSubmit}
                                disabled={payoutLoading || !payoutAmount || !payoutImage}
                            >
                                <LinearGradient
                                    colors={[theme.primary, theme.primary + 'CC']}
                                    style={styles.submitGradient}
                                >
                                    {payoutLoading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <CheckCircle size={20} color="#fff" />
                                            <Text style={styles.submitText}>Submit Payout Record</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Fund Modal (Add/Withdraw) */}
            <Modal visible={fundModalVisible} transparent animationType="slide" onRequestClose={() => setFundModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.fundModalContainer}>
                        <View style={styles.fundModalHeader}>
                            <View>
                                <Text style={styles.fundModalSubtitle}>{fundType === 'DEPOSIT' ? 'ADD CAPITAL' : 'WITHDRAWAL'}</Text>
                                <Text style={styles.fundModalTitle}>{fundType === 'DEPOSIT' ? 'Increase Portfolio' : 'Decrease Portfolio'}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setFundModalVisible(false)} style={styles.modalCloseBtn}>
                                <X size={20} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.fundModalBody} showsVerticalScrollIndicator={false}>
                            {/* Alert Box */}
                            <View style={[styles.fundAlertBox, {
                                backgroundColor: fundType === 'DEPOSIT' ? theme.success + '08' : theme.error + '08',
                                borderLeftColor: fundType === 'DEPOSIT' ? theme.success : theme.error
                            }]}>
                                <Shield size={16} color={fundType === 'DEPOSIT' ? theme.success : theme.error} />
                                <Text style={[styles.fundAlertText, { color: fundType === 'DEPOSIT' ? theme.success : theme.error }]}>
                                    {fundType === 'DEPOSIT'
                                        ? 'This will increase the client\'s invested capital and total portfolio value.'
                                        : 'This will decrease available profit first, then capital if needed.'}
                                </Text>
                            </View>

                            {/* Massive Amount Input */}
                            <View style={styles.centeredAmountContainer}>
                                <Text style={styles.amountLabel}>ENTER AMOUNT</Text>
                                <View style={styles.massiveInputWrapper}>
                                    <Text style={styles.massiveCurrencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.massiveAmountInput}
                                        placeholder="0"
                                        placeholderTextColor={theme.textSecondary + '50'}
                                        keyboardType="decimal-pad"
                                        value={fundAmount}
                                        onChangeText={setFundAmount}
                                        autoFocus
                                    />
                                </View>
                            </View>

                            <View style={styles.modalInputGroup}>
                                <Text style={styles.modalInputLabel}>ADMIN NOTE / REMARK</Text>
                                <View style={styles.modalInputWrapper}>
                                    <FileText size={18} color={theme.textSecondary} />
                                    <TextInput
                                        style={styles.modalTextInput}
                                        placeholder="Reason for this adjustment..."
                                        placeholderTextColor={theme.textSecondary}
                                        value={fundNote}
                                        onChangeText={setFundNote}
                                    />
                                </View>
                            </View>

                            <View style={styles.impactPreview}>
                                <View style={styles.impactItem}>
                                    <View style={styles.impactLabelRow}>
                                        <Wallet size={14} color={theme.textSecondary} />
                                        <Text style={styles.impactLabel}>Current Balance</Text>
                                    </View>
                                    <Text style={styles.impactValue}>{formatCurrency(portfolio?.totalValue || 0)}</Text>
                                </View>
                                <ChevronRight size={16} color={theme.cardBorder} />
                                <View style={[styles.impactItem, { alignItems: 'flex-end' }]}>
                                    <View style={styles.impactLabelRow}>
                                        <Text style={styles.impactLabel}>Projected</Text>
                                        <TrendingUp size={14} color={fundType === 'DEPOSIT' ? theme.success : theme.error} />
                                    </View>
                                    <Text style={[styles.impactValue, { color: fundType === 'DEPOSIT' ? theme.success : theme.error }]}>
                                        {formatCurrency((portfolio?.totalValue || 0) + (parseFloat(fundAmount || 0) * (fundType === 'DEPOSIT' ? 1 : -1)))}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.payoutSubmitBtn, (fundLoading || !fundAmount) && { opacity: 0.5 }]}
                                onPress={handleFundSubmit}
                                disabled={fundLoading || !fundAmount}
                            >
                                <LinearGradient
                                    colors={fundType === 'DEPOSIT' ? [theme.success, theme.success + 'CC'] : [theme.error, theme.error + 'CC']}
                                    style={styles.submitGradient}
                                >
                                    {fundLoading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <CheckCircle size={20} color="#fff" />
                                            <Text style={styles.submitText}>
                                                {fundType === 'DEPOSIT' ? 'Confirm Addition' : 'Confirm Withdrawal'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                            <View style={{ height: 20 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>



        </SafeAreaView >
    );
}

const getStyles = (theme, isDark) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: theme.textSecondary, fontWeight: '600', fontSize: 13 },

    // Header
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: theme.background },
    headerTitleContainer: { flex: 1, marginLeft: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    backBtn: { padding: 4 },
    headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deactivateHeaderBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.error + '10', borderWidth: 1, borderColor: theme.error + '25' },
    deactivateHeaderText: { color: theme.error, fontSize: 13, fontWeight: '700' },
    actionIconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

    // Portfolio Card
    statsCard: { padding: 20, borderRadius: 24, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: theme.cardBorder },
    statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
    statsIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center' },
    statsTitleText: { fontSize: 10, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1.5 },

    statsMainGrid: { flexDirection: 'row', marginBottom: 16 },
    statsMainItem: { flex: 1 },
    statsMainLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 4 },
    statsMainValue: { fontSize: 20, fontWeight: '800', color: theme.textPrimary },

    divider: { height: 1, backgroundColor: theme.cardBorder + '80', marginBottom: 16 },

    statsSubGrid: { flexDirection: 'row', marginBottom: 20 },
    statsSubItem: { flex: 1 },
    statsSubLabel: { fontSize: 11, fontWeight: '600', color: theme.textSecondary, marginBottom: 2 },
    statsSubValue: { fontSize: 16, fontWeight: '700' },
    profitPercentRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

    quickActions: { flexDirection: 'row', gap: 10 },
    quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, gap: 6 },
    quickActionBtnText: { fontWeight: '700', fontSize: 13 },

    // Main Buttons (Payout & Login)
    mainActionsGridRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    actionBtn: { flex: 1, height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    primaryActionBtn: { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
    secondaryActionBtn: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
    primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
    secondaryActionText: { color: theme.primary, fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },

    // Full Reactivate Button
    mainActionsContainer: { marginBottom: 24 },
    fullReactivateBtn: { height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: theme.success, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    fullReactivateGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    fullReactivateText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

    actionBtnLocked: { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: theme.cardBorder, shadowOpacity: 0, elevation: 0, borderStyle: 'dashed' },
    lockedActionText: { color: theme.textSecondary, fontWeight: '600' },
    quickActionBtnDisabled: { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', opacity: 0.6 },

    filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.cardBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder },

    // Dropdown Styles
    dropdownContainer: { position: 'relative' },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.cardBg,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        minWidth: 100,
        justifyContent: 'space-between'
    },
    dropdownValue: { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    dropdownMenuInline: {
        position: 'absolute',
        top: 45,
        right: 0,
        backgroundColor: theme.cardBg,
        borderRadius: 12,
        width: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 8,
        borderWidth: 1,
        borderColor: theme.cardBorder,
        padding: 6,
        zIndex: 1000
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8
    },
    dropdownItemText: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
    dropdownItemTextActive: { color: theme.primary, fontWeight: '700' },
    activeDotSmall: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, zIndex: 100 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: theme.textPrimary },

    emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.cardBg, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.cardBorder },
    emptyText: { color: theme.textSecondary, fontWeight: '500', fontSize: 14 },

    transCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: theme.cardBorder },
    transIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    transInfo: { flex: 1, marginLeft: 14 },
    transTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    transType: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
    transAmount: { fontSize: 15, fontWeight: '800' },
    transBottomRow: { flexDirection: 'row', alignItems: 'center' },
    transDate: { fontSize: 12, color: theme.textSecondary, fontWeight: '500' },
    transDivider: { width: 3, height: 3, borderRadius: 2, backgroundColor: theme.cardBorder, marginHorizontal: 8 },
    miniStatusBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
    miniStatusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

    // Standardized Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { backgroundColor: theme.cardBg, borderRadius: 32, width: '100%', maxWidth: 450, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, borderWidth: 1, borderColor: theme.cardBorder },
    modalHeaderExtra: { padding: 24, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalTopSubtitle: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 4 },
    modalTopTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary },
    modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
    modalBody: { padding: 24, paddingTop: 0 },

    // Inputs
    inputGroup: { marginBottom: 20 },
    inputLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 16, height: 56, borderWidth: 1, borderColor: theme.cardBorder },
    inputIconBox: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' },
    textInput: { flex: 1, paddingRight: 16, fontSize: 15, fontWeight: '600', color: theme.textPrimary },

    // Uploader
    imageUploader: { height: 160, borderRadius: 20, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder, borderStyle: 'dashed', overflow: 'hidden', marginBottom: 24 },
    uploadPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    uploadIconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.primary + '10', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    uploadTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 },
    uploadSub: { fontSize: 12, color: theme.textSecondary },
    uploadPreview: { width: '100%', height: '100%' },
    uploadBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    uploadBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    // Buttons
    modalSubmitBtn: { height: 56, borderRadius: 18, overflow: 'hidden', marginTop: 8 },
    submitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },

    alertBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderLeftWidth: 3, marginBottom: 20 },
    alertText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 18 },

    // Combined/New Fund Modal Styles
    fundModalContainer: { width: '100%', borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: theme.cardBg, marginTop: 'auto', paddingBottom: 20, maxHeight: '90%' },
    fundModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: theme.cardBorder + '50' },
    fundModalSubtitle: { fontSize: 10, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
    fundModalTitle: { fontSize: 20, fontWeight: '800', color: theme.textPrimary },
    fundModalBody: { paddingHorizontal: 24, paddingVertical: 16 },
    fundAlertBox: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, borderLeftWidth: 4, marginBottom: 16 },
    fundAlertText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },

    centeredAmountContainer: { alignItems: 'center', marginBottom: 20 },
    amountLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 4 },
    massiveInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    massiveCurrencySymbol: { fontSize: 32, fontWeight: '800', color: theme.textPrimary, marginRight: 8 },
    massiveAmountInput: { fontSize: 44, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', minWidth: 100 },


    modalInputGroup: { marginBottom: 16 },
    modalInputLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
    modalInputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.background, borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: theme.cardBorder },
    modalTextInput: { flex: 1, color: theme.textPrimary, fontSize: 14, fontWeight: '600' },

    impactPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 24 },
    impactItem: { flex: 1 },
    impactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    impactLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary },
    impactValue: { fontSize: 17, fontWeight: '800', color: theme.textPrimary },

    payoutSubmitBtn: { height: 60, borderRadius: 18, overflow: 'hidden', shadowColor: theme.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },

    // Profit UI Styles
    effectiveDateText: { fontSize: 13, fontWeight: '600' },
    profitConfigCard: { backgroundColor: theme.cardBg, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: theme.cardBorder, marginBottom: 24 },
    configRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    configLabel: { fontSize: 15, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    configDesc: { fontSize: 13, color: theme.textSecondary, fontWeight: '500', maxWidth: 220 },
    modeToggleContainer: { flexDirection: 'row', backgroundColor: theme.background, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder },
    modeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    modeBtnText: { fontSize: 12, fontWeight: '800', color: theme.textSecondary },
    divider: { height: 1, backgroundColor: theme.cardBorder, marginVertical: 8 },
    rateInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, paddingHorizontal: 12, height: 44, width: 100 },
    rateInput: { flex: 1, fontSize: 16, fontWeight: '800', textAlign: 'right', marginRight: 4 },
    percentSymbol: { fontSize: 14, fontWeight: '700' },
    toggleBtn: { width: 50, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 4 },
    toggleCircle: { width: 22, height: 22, borderRadius: 11, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    saveConfigBtn: { alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 16 },
    saveConfigText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    configFooterText: { marginTop: 16, fontSize: 12, fontWeight: '500', textAlign: 'center' }
});
