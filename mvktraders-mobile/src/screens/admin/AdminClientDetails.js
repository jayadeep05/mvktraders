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
    StatusBar,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
    Clipboard
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
    Copy,
    FileText,
    Filter,
    ChevronDown,
    Upload,
    ArrowRight,
    Info
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
    const [imageViewerVisible, setImageViewerVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyMessage = () => {
        if (payoutAmount) {
            const msg = generatePayoutMessage(payoutAmount);
            Clipboard.setString(msg);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

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

    // Action Modal State
    const [actionModalVisible, setActionModalVisible] = useState(false);
    const [actionConfig, setActionConfig] = useState({
        title: '',
        message: '',
        icon: 'AlertTriangle',
        type: 'info',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        onConfirm: () => { }
    });

    const triggerActionModal = (config) => {
        setActionConfig(prev => ({
            ...prev,
            cancelLabel: 'Cancel', // Default fallback
            ...config
        }));
        setActionModalVisible(true);
    };

    const handleSaveProfitConfig = async () => {
        triggerActionModal({
            title: 'Confirm Update',
            message: 'This will affect future profit calculations only. Past profits will not be changed.',
            icon: 'TrendingUp',
            type: 'warning',
            confirmLabel: 'Save Changes',
            onConfirm: async () => {
                try {
                    setSavingProfit(true);
                    await adminService.updateClientProfitConfig(clientId, {
                        profitMode,
                        profitPercentage: parseFloat(profitPercentage) || 0,
                        isProrationEnabled,
                        allowEarlyExit
                    });

                    setActionModalVisible(false);
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Success!',
                            message: 'Profit configuration updated successfully.',
                            icon: 'CheckCircle',
                            type: 'success',
                            confirmLabel: 'Done'
                        });
                    }, 500);
                    loadData(false);
                } catch (e) {
                    const errorMsg = e.response?.data?.message || e.message || 'Update failed';
                    setActionModalVisible(false);
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Error',
                            message: errorMsg,
                            icon: 'XCircle',
                            type: 'error',
                            confirmLabel: 'Retry'
                        });
                    }, 500);
                }
                finally { setSavingProfit(false); }
            }
        });
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
            // Sort transactions by date descending
            const sortedTrans = (transRes || []).sort((a, b) => {
                const dateA = new Date(a.date || a.createdAt || a.timestamp);
                const dateB = new Date(b.date || b.createdAt || b.timestamp);
                return dateB - dateA;
            });
            setTransactions(sortedTrans);

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
        triggerActionModal({
            title: 'Impersonate User',
            message: `You are about to log in as ${clientName}. This will switch your session immediately to the client perspective.`,
            icon: 'UserCheck',
            type: 'info',
            confirmLabel: 'Proceed to Login',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    const res = await adminService.impersonateUser(clientId);
                    const success = await setSession(res.access_token, res.refresh_token);
                    if (!success) {
                        triggerActionModal({
                            title: 'Error',
                            message: 'Failed to establish session',
                            icon: 'XCircle',
                            type: 'error'
                        });
                    }
                } catch (e) {
                    console.error("Impersonation failed", e);
                    triggerActionModal({
                        title: 'Error',
                        message: 'Impersonation failed',
                        icon: 'XCircle',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleDeactivate = async () => {
        triggerActionModal({
            title: 'Deactivate User',
            message: `Are you sure you want to deactivate ${clientName}'s account? They will lose access immediately, but their data will be preserved.`,
            icon: 'XCircle',
            type: 'destructive',
            confirmLabel: 'Deactivate Account',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    await adminService.deleteUser(clientId);
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Success',
                            message: 'User deactivated successfully.',
                            icon: 'CheckCircle',
                            type: 'success'
                        });
                    }, 500);
                    loadData(false);
                } catch (e) {
                    triggerActionModal({
                        title: 'Error',
                        message: e.response?.data?.message || e.message,
                        icon: 'XCircle',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handleReactivate = async () => {
        triggerActionModal({
            title: 'Activate Account',
            message: `Are you sure you want to reactivate ${clientName}'s account and restore their access?`,
            icon: 'UserPlus',
            type: 'success',
            confirmLabel: 'Activate Now',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    await adminService.reactivateUser(clientId);
                    setTimeout(() => {
                        triggerActionModal({
                            title: 'Success',
                            message: 'Account reactivated successfully.',
                            icon: 'CheckCircle',
                            type: 'success'
                        });
                    }, 500);
                    loadData(false);
                } catch (e) {
                    triggerActionModal({
                        title: 'Error',
                        message: 'Failed to reactivate user',
                        icon: 'XCircle',
                        type: 'error'
                    });
                }
            }
        });
    };

    const handlePermanentDelete = async () => {
        triggerActionModal({
            title: 'Delete Permanently',
            message: `This will permanently remove ${clientName} and all records. This action is irreversible and final.`,
            icon: 'Trash',
            type: 'destructive',
            confirmLabel: 'Permanent Delete',
            onConfirm: async () => {
                try {
                    setActionModalVisible(false);
                    await adminService.deleteUserPermanently(clientId);
                    navigation.goBack();
                } catch (e) {
                    triggerActionModal({
                        title: 'Error',
                        message: 'Failed to delete user',
                        icon: 'XCircle',
                        type: 'error'
                    });
                }
            }
        });
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

    const generatePayoutMessage = (amount) => {
        if (!portfolio || !portfolio.user) return '';

        const payoutAmt = parseFloat(amount) || 0;
        const user = portfolio.user;
        const availableProfit = portfolio.availableProfit || 0;
        const totalInvested = portfolio.totalInvested || 0;
        const profitPercentage = portfolio.profitPercentage || 0;

        let newTotalInvested = totalInvested;
        let newAvailableProfit = availableProfit;

        if (availableProfit >= payoutAmt) {
            newAvailableProfit = availableProfit - payoutAmt;
        } else {
            const remainder = payoutAmt - availableProfit;
            newAvailableProfit = 0;
            newTotalInvested = totalInvested - remainder;
        }

        const formatNum = (num) => Math.floor(num).toLocaleString('en-IN');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const formatDateUpper = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

        const dateString = formatDateUpper(now);
        const profitPeriod = `${formatDateUpper(startOfMonth)} TO ${formatDateUpper(endOfMonth)}`;

        return `USER ID : ${user.userId || user.id}
CLIENT NAME : ${user.name}
MOBILE NUMBER : ${user.mobile || 'N/A'}

PREVIOUS INVESTMENT : ₹${formatNum(totalInvested)}

MONTHLY RETURN RATE 📈 : ${profitPercentage}%

PAYOUT TRANSACTION ID : TXN_ID_PLACEHOLDER
-----------------------------------

PROFIT PAID FOR : ${profitPeriod}

Remaining Profit : ₹${formatNum(newAvailableProfit)}
AMOUNT PAID : ₹${formatNum(payoutAmt)}
DATE : ${dateString}

CURRENT INVESTMENT : ₹${formatNum(newTotalInvested)}
FROM ${dateString} ONWARDS

Your future profits will be calculated based on the current active investment.`;
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
            // Use the generated message instead of simple text
            const generatedMessage = generatePayoutMessage(payoutAmount);
            formData.append('message', generatedMessage);

            const uri = Platform.OS === 'android' ? payoutImage.uri : payoutImage.uri.replace('file://', '');
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            formData.append('screenshot', { uri, name: filename, type });

            await adminService.createPayout(formData);

            setTimeout(() => {
                triggerActionModal({
                    title: 'Payout Recorded',
                    message: `A payout of ₹${parseFloat(payoutAmount).toLocaleString('en-IN')} has been logged.`,
                    icon: 'CheckCircle',
                    type: 'success',
                    confirmLabel: 'Excellent'
                });
            }, 500);

            setPayoutVisible(false);
            setPayoutAmount('');
            setPayoutDate('');
            setPayoutImage(null);
            loadData(false);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Payout failed';
            setTimeout(() => {
                triggerActionModal({
                    title: 'Payout Error',
                    message: errorMsg,
                    icon: 'XCircle',
                    type: 'error',
                    confirmLabel: 'Retry'
                });
            }, 500);
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

            setTimeout(() => {
                triggerActionModal({
                    title: 'Adjustment Successful',
                    message: `${fundType === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} of ₹${parseFloat(fundAmount).toLocaleString('en-IN')} synchronized.`,
                    icon: 'CheckCircle',
                    type: 'success',
                    confirmLabel: 'Done'
                });
            }, 500);

            setFundModalVisible(false);
            setFundAmount('');
            setFundNote('');
            loadData(false);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Transaction failed';
            setTimeout(() => {
                triggerActionModal({
                    title: 'Transaction Error',
                    message: errorMsg,
                    icon: 'XCircle',
                    type: 'error'
                });
            }, 500);
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
                    <Text style={styles.headerTitle} numberOfLines={1}>{clientName}</Text>
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



                {/* Profit & Compounding Configuration - IMPROVED & FIXED UI */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIconCircle}>
                            <TrendingUp size={16} color="#fff" />
                        </View>
                        <Text style={styles.sectionTitle}>Profit Settings</Text>
                    </View>
                    {profitEffectiveDate && (
                        <View style={styles.dateBadge}>
                            <Clock size={10} color={theme.textSecondary} />
                            <Text style={styles.dateBadgeText}>{profitEffectiveDate}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.profitCard}>
                    {/* Header Row: Mode Select */}
                    <View style={styles.profitHeaderRow}>
                        <View>
                            <Text style={styles.pLabel}>PROFIT MODE</Text>
                            <Text style={styles.pSub}>How profit is applied</Text>
                        </View>
                        <View style={styles.modeSwitch}>
                            <TouchableOpacity
                                style={[styles.switchOption, profitMode === 'FIXED' && styles.switchOptionActive]}
                                onPress={() => setProfitMode('FIXED')}
                            >
                                <Text style={[styles.switchText, profitMode === 'FIXED' && styles.switchTextActive]}>Fixed</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.switchOption, profitMode === 'COMPOUNDING' && styles.switchOptionActive]}
                                onPress={() => setProfitMode('COMPOUNDING')}
                            >
                                <Text style={[styles.switchText, profitMode === 'COMPOUNDING' && styles.switchTextActive]}>Compound</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.pDivider} />

                    {/* Percentage Input */}
                    <View style={styles.pRow}>
                        <View>
                            <Text style={styles.pLabel}>MONTHLY RETURN</Text>
                            <Text style={styles.pSub}>Profit percentage for next cycle</Text>
                        </View>
                        <View style={styles.percentInputBox}>
                            <TextInput
                                style={styles.percentInput}
                                value={profitPercentage}
                                onChangeText={setProfitPercentage}
                                keyboardType="decimal-pad"
                                placeholder="0.0"
                                placeholderTextColor={theme.textSecondary + '50'}
                            />
                            <Text style={styles.percentSuffix}>%</Text>
                        </View>
                    </View>

                    <View style={styles.pDivider} />

                    {/* Toggles */}
                    <View style={styles.pRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.pLabel}>PRORATION</Text>
                            <Text style={styles.pSub}>Partial profit for first month</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setIsProrationEnabled(!isProrationEnabled)}
                            style={[styles.toggleTrack, isProrationEnabled ? { backgroundColor: theme.success } : { backgroundColor: theme.cardBorder }]}
                        >
                            <View style={[styles.toggleKnob, isProrationEnabled ? { transform: [{ translateX: 20 }] } : { transform: [{ translateX: 2 }] }]} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.pDivider} />

                    <View style={styles.pRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.pLabel}>EARLY EXIT</Text>
                            <Text style={styles.pSub}>Allow client to withdraw capital</Text>
                        </View>
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setAllowEarlyExit(!allowEarlyExit)}
                            style={[styles.toggleTrack, allowEarlyExit ? { backgroundColor: theme.primary } : { backgroundColor: theme.cardBorder }]}
                        >
                            <View style={[styles.toggleKnob, allowEarlyExit ? { transform: [{ translateX: 20 }] } : { transform: [{ translateX: 2 }] }]} />
                        </TouchableOpacity>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSaveProfitConfig}
                        disabled={savingProfit}
                    >
                        {savingProfit ? <ActivityIndicator size="small" color="#fff" /> : (
                            <Text style={styles.saveBtnText}>Update Configuration</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.pFooter}>Changes apply from the next calculation cycle.</Text>
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

            {/* Payout Modal - Premium UI */}
            <Modal visible={payoutVisible} transparent animationType="fade" onRequestClose={() => setPayoutVisible(false)}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setPayoutVisible(false)}
                    />

                    <View style={styles.payoutPremiumCard}>
                        {/* Elite Header */}
                        <View style={styles.premiumHeaderBar}>
                            <View style={styles.premiumTitleMeta}>
                                <Text style={styles.premiumOverline}>SETTLEMENT PORTAL</Text>
                                <Text style={styles.premiumHeadline}>Process Payout</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setPayoutVisible(false)}
                                style={styles.premiumCircularX}
                            >
                                <X size={18} color={theme.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.premiumContainerBody}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 32 }}
                        >
                            {/* Elegantly Proportioned Amount Input */}
                            <View style={styles.premiumControlGroup}>
                                <Text style={styles.premiumFieldLabel}>Amount for Disbursement</Text>
                                <View style={styles.ultraCompactInput}>
                                    <Text style={styles.premiumInputCompactSymbol}>₹</Text>
                                    <TextInput
                                        style={styles.premiumInputCompact}
                                        placeholder="0"
                                        placeholderTextColor={theme.textSecondary + '40'}
                                        keyboardType="numeric"
                                        value={payoutAmount}
                                        onChangeText={setPayoutAmount}
                                        autoFocus
                                        selectionColor={theme.primary}
                                    />
                                </View>
                            </View>

                            {/* Minimalist Proof Upload Area */}
                            <View style={styles.premiumControlGroup}>
                                <Text style={styles.premiumFieldLabel}>Transaction Verification</Text>
                                {payoutImage ? (
                                    <View style={styles.premiumValidationBox}>
                                        <TouchableOpacity
                                            activeOpacity={0.9}
                                            onPress={() => setImageViewerVisible(true)}
                                            style={styles.premiumHeroThumb}
                                        >
                                            <Image source={{ uri: payoutImage.uri }} style={styles.premiumHeroImg} />
                                            <View style={styles.premiumHeroBlur}>
                                                <Text style={styles.premiumHeroTag}>View</Text>
                                            </View>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={pickImage}
                                            style={styles.premiumResetBtn}
                                        >
                                            <Upload size={14} color={theme.primary} />
                                            <Text style={styles.premiumResetText}>Update Proof</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        onPress={pickImage}
                                        style={styles.premiumSurfaceAction}
                                    >
                                        <View style={styles.premiumSurfaceIcon}>
                                            <Plus size={20} color={theme.primary} />
                                        </View>
                                        <View>
                                            <Text style={styles.premiumSurfaceTitle}>Attach Proof</Text>
                                            <Text style={styles.premiumSurfaceDetail}>JPEG, PNG supported</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {/* Refined Context Draft */}
                            <View style={styles.premiumControlGroup}>
                                <View style={styles.premiumRowHeader}>
                                    <Text style={[styles.premiumFieldLabel, { marginBottom: 0 }]}>Settlement Narrative</Text>
                                    <View style={styles.premiumBadgeAuto}>
                                        <Text style={styles.premiumBadgeAutoText}>AUTO</Text>
                                    </View>
                                </View>
                                <View style={styles.premiumNarrativeStatic}>
                                    {payoutAmount && (
                                        <TouchableOpacity
                                            onPress={handleCopyMessage}
                                            style={styles.absoluteCopyBtn}
                                            activeOpacity={0.7}
                                        >
                                            {copied ? <CheckCircle size={14} color={theme.success} /> : <Copy size={14} color={theme.primary} />}
                                        </TouchableOpacity>
                                    )}
                                    {payoutAmount ? (
                                        <Text style={styles.narrativeTypeface}>
                                            {generatePayoutMessage(payoutAmount)}
                                        </Text>
                                    ) : (
                                        <View style={styles.narrativeEmpty}>
                                            <Text style={styles.narrativePlaceholder}>Message details will appear once amount is entered...</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                        </ScrollView>

                        {/* Commanding Call to Action - Docked at Bottom */}
                        <View style={styles.premiumFooter}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.premiumMasterBtn, (!payoutAmount || !payoutImage) && { opacity: 0.5 }]}
                                onPress={handlePayoutSubmit}
                                disabled={payoutLoading || !payoutAmount || !payoutImage}
                            >
                                <LinearGradient
                                    colors={(!payoutAmount || !payoutImage) ? [theme.cardBorder, theme.cardBorder] : [theme.primary, theme.primary + 'DD']}
                                    style={styles.premiumMasterGradient}
                                >
                                    {payoutLoading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <View style={styles.premiumMasterContent}>
                                            <Text style={styles.premiumMasterText}>Submit</Text>
                                            <ArrowRight size={18} color="#fff" />
                                        </View>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Image Viewer Modal */}
            <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
                <View style={styles.imageViewerOverlay}>
                    <TouchableOpacity
                        style={styles.imageViewerClose}
                        onPress={() => setImageViewerVisible(false)}
                    >
                        <X size={28} color="#fff" />
                    </TouchableOpacity>
                    {payoutImage && (
                        <Image
                            source={{ uri: payoutImage.uri }}
                            style={styles.fullscreenImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Fund Modal (Add/Withdraw) */}
            <Modal visible={fundModalVisible} transparent animationType="slide" onRequestClose={() => setFundModalVisible(false)}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalOverlay}
                    >
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
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </Modal >



            {/* Action Modal - Premium Experience */}
            <Modal
                visible={actionModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setActionModalVisible(false)}
            >
                <View style={styles.actionModalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setActionModalVisible(false)}
                    />
                    <View style={styles.actionCard}>
                        <View style={[styles.actionIconBoxLarge, {
                            backgroundColor: actionConfig.type === 'destructive' ? theme.error + '15' :
                                actionConfig.type === 'success' ? theme.success + '15' :
                                    actionConfig.type === 'warning' ? theme.warning + '15' : theme.primary + '15'
                        }]}>
                            {actionConfig.icon === 'UserCheck' && <UserCheck size={32} color={theme.primary} />}
                            {actionConfig.icon === 'XCircle' && <XCircle size={32} color={theme.error} />}
                            {actionConfig.icon === 'UserPlus' && <UserPlus size={32} color={theme.success} />}
                            {actionConfig.icon === 'Trash' && <Trash size={32} color={theme.error} />}
                            {actionConfig.icon === 'TrendingUp' && <TrendingUp size={32} color={theme.warning} />}
                        </View>

                        <Text style={styles.actionTitle}>{actionConfig.title}</Text>
                        <Text style={styles.actionMessage}>{actionConfig.message}</Text>

                        <View style={styles.actionBtnRow}>
                            <TouchableOpacity
                                style={styles.actionCancelBtn}
                                onPress={() => setActionModalVisible(false)}
                            >
                                <Text style={styles.actionCancelText}>{actionConfig.cancelLabel || 'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionConfirmBtn, {
                                    backgroundColor: actionConfig.type === 'destructive' ? theme.error :
                                        actionConfig.type === 'success' ? theme.success :
                                            actionConfig.type === 'warning' ? theme.warning : theme.primary
                                }]}
                                onPress={() => {
                                    setActionModalVisible(false);
                                    actionConfig.onConfirm();
                                }}
                            >
                                <Text style={styles.actionConfirmText}>{actionConfig.confirmLabel}</Text>
                            </TouchableOpacity>
                        </View>
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
    headerTitle: { fontSize: 18, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder },
    headerRightActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginLeft: 10 },
    deactivateHeaderBtn: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: theme.error + '12', borderWidth: 1, borderColor: theme.error + '30',
        alignItems: 'center', justifyContent: 'center', minWidth: 100
    },
    deactivateHeaderText: { color: theme.error, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

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

    modalInputGroup: { marginBottom: 20 },
    modalInputLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 8 },
    modalInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 16, height: 56, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 16, gap: 12 },
    modalTextInput: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.textPrimary },

    impactPreview: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background,
        padding: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.cardBorder,
        marginBottom: 24, gap: 12
    },
    impactItem: { flex: 1 },
    impactLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    impactLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary },
    impactValue: { fontSize: 15, fontWeight: '800', color: theme.textPrimary },

    payoutSubmitBtn: { height: 56, borderRadius: 18, overflow: 'hidden', marginTop: 8 },


    // --- PREMIUM A-CLASS PAYOUT MODAL STYLES ---
    payoutPremiumCard: {
        width: '92%',
        maxWidth: 400,
        backgroundColor: theme.cardBg,
        borderRadius: 36,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: theme.cardBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 16,
        maxHeight: '85%'
    },
    premiumHeaderBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 28,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder + '60'
    },
    premiumTitleMeta: { flex: 1 },
    premiumOverline: { fontSize: 9, fontWeight: '900', color: theme.primary, letterSpacing: 2.5, marginBottom: 4 },
    premiumHeadline: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.5 },
    premiumCircularX: {
        width: 36, height: 36, borderRadius: 14, backgroundColor: theme.background,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder
    },

    premiumContainerBody: { paddingHorizontal: 28, paddingTop: 28 },
    premiumControlGroup: { marginBottom: 32 },
    premiumFieldLabel: { fontSize: 13, fontWeight: '700', color: theme.textSecondary, marginBottom: 14, marginLeft: 2 },

    premiumInputLid: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background,
        borderRadius: 20, height: 72, borderWidth: 1.5, borderColor: theme.cardBorder,
        paddingHorizontal: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 10, elevation: 4
    },
    ultraCompactInput: {
        backgroundColor: theme.background,
        borderRadius: 12, height: 48, borderWidth: 1, borderColor: theme.cardBorder,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8
    },
    premiumInputCompactSymbol: { fontSize: 18, fontWeight: '800', color: theme.primary },
    premiumInputCompact: { flex: 1, fontSize: 18, fontWeight: '700', color: theme.textPrimary },

    premiumSymbolLarge: { fontSize: 24, fontWeight: '700', color: theme.primary, marginRight: 14 },
    premiumInputText: { flex: 1, fontSize: 30, fontWeight: '800', color: theme.textPrimary, letterSpacing: -1 },

    premiumSurfaceAction: {
        flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: theme.background,
        borderRadius: 22, borderWidth: 1.5, borderColor: theme.cardBorder, borderStyle: 'dashed', gap: 18
    },
    premiumSurfaceIcon: {
        width: 48, height: 48, borderRadius: 16, backgroundColor: theme.primary + '10',
        alignItems: 'center', justifyContent: 'center'
    },
    premiumSurfaceTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    premiumSurfaceDetail: { fontSize: 12, color: theme.textSecondary, marginTop: 2, opacity: 0.8 },

    premiumValidationBox: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    premiumHeroThumb: {
        width: 100, height: 72, borderRadius: 18, overflow: 'hidden',
        borderWidth: 1.5, borderColor: theme.cardBorder, position: 'relative'
    },
    premiumHeroImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    premiumHeroBlur: {
        position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center'
    },
    premiumHeroTag: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },
    premiumResetBtn: {
        flex: 1, height: 72, borderRadius: 18, backgroundColor: theme.background,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        borderWidth: 1, borderColor: theme.cardBorder
    },
    premiumResetText: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },

    premiumRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    premiumBadgeAuto: {
        backgroundColor: theme.background, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, borderWidth: 1, borderColor: theme.cardBorder
    },
    premiumBadgeAutoText: { fontSize: 9, fontWeight: '900', color: theme.textSecondary, letterSpacing: 0.8 },
    premiumNarrativeStatic: {
        backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)',
        borderRadius: 20, borderWidth: 1, borderColor: theme.cardBorder, padding: 16,
        position: 'relative', minHeight: 100
    },
    absoluteCopyBtn: {
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        backgroundColor: theme.cardBg, width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.cardBorder,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2
    },
    narrativeTypeface: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11.5,
        lineHeight: 18, color: theme.textPrimary, opacity: 0.9, paddingRight: 30
    },
    narrativeEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, opacity: 0.4 },
    narrativePlaceholder: { fontSize: 12, color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center' },

    premiumFooter: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: theme.cardBorder + '50',
        backgroundColor: theme.cardBg
    },
    premiumMasterBtn: { height: 60, borderRadius: 20, overflow: 'hidden', elevation: 4 },
    premiumMasterGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    premiumMasterContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    premiumMasterText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

    // Elite Image Viewer
    imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.98)', justifyContent: 'center', alignItems: 'center' },
    imageViewerClose: {
        position: 'absolute', top: 60, right: 28, zIndex: 100, width: 44, height: 44,
        borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center'
    },
    fullscreenImage: { width: '100%', height: '100%' },
    // --- PROFIT SETTINGS CARD PREMIUM STYLES ---
    sectionIconCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
    dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.cardBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.cardBorder },
    dateBadgeText: { fontSize: 10, fontWeight: '700', color: theme.textSecondary },

    profitCard: { backgroundColor: theme.cardBg, borderRadius: 24, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: theme.cardBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },

    profitHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    pLabel: { fontSize: 11, fontWeight: '800', color: theme.textSecondary, letterSpacing: 1, marginBottom: 4 },
    pSub: { fontSize: 11, color: theme.textSecondary, opacity: 0.7, maxWidth: 200 },

    modeSwitch: { flexDirection: 'row', backgroundColor: theme.background, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder },
    switchOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    switchOptionActive: { backgroundColor: theme.primary, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 4, elevation: 2 },
    switchText: { fontSize: 12, fontWeight: '700', color: theme.textSecondary },
    switchTextActive: { color: '#fff' },

    pDivider: { height: 1, backgroundColor: theme.cardBorder, opacity: 0.5, marginVertical: 12 },

    pRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },

    percentInputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, height: 44, paddingHorizontal: 16, width: 100 },
    percentInput: { flex: 1, fontSize: 16, fontWeight: '800', color: theme.textPrimary, textAlign: 'right', marginRight: 4 },
    percentSuffix: { fontSize: 14, fontWeight: '700', color: theme.textSecondary },

    toggleTrack: { width: 48, height: 28, borderRadius: 14, justifyContent: 'center', paddingHorizontal: 2 },
    toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 },

    saveBtn: { backgroundColor: theme.primary + '10', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20, borderWidth: 1, borderColor: theme.primary + '30' },
    saveBtnText: { color: theme.primary, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
    pFooter: { textAlign: 'center', fontSize: 10, color: theme.textSecondary, marginTop: 12, opacity: 0.7 },

    // Action Modal Styles
    actionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    actionCard: { width: '95%', maxWidth: 380, backgroundColor: theme.cardBg, borderRadius: 32, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 20, borderWidth: 1, borderColor: theme.cardBorder },
    actionIconBoxLarge: { width: 80, height: 80, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    actionTitle: { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 12, textAlign: 'center' },
    actionMessage: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32, opacity: 0.8 },
    actionBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
    actionCancelBtn: {
        flex: 1, height: 58, borderRadius: 20, paddingHorizontal: 8,
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
        borderWidth: 1.5, borderColor: theme.cardBorder
    },
    actionCancelText: { color: theme.textPrimary, fontWeight: '800', fontSize: 13, opacity: 0.8 },
    actionConfirmBtn: {
        flex: 1.8, height: 58, borderRadius: 20, paddingHorizontal: 8,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6
    },
    actionConfirmText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.2, textAlign: 'center' }
});

