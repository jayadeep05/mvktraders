import React, { useEffect, useState } from 'react';
import { clientService, portfolioService, profitService, depositService, withdrawalService, authService } from '../services/api';
import { ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, History, Filter, LogOut, KeyRound, UserCircle, ChevronDown, ChevronUp, CalendarClock, Banknote, Copy, ChevronLeft, ChevronRight, Menu, X, Eye, Bell } from 'lucide-react';
import WithdrawalRequestModal from '../components/WithdrawalRequestModal';
import DepositRequestModal from '../components/DepositRequestModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import PayoutPreviewModal from '../components/PayoutPreviewModal';
import ProfileModal from '../components/ProfileModal';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';

const ClientDashboard = () => {
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState(null);
    const [profitHistory, setProfitHistory] = useState([]);
    const [history, setHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [filterType, setFilterType] = useState('ALL'); // ALL, DEPOSIT, WITHDRAWAL
    const [loading, setLoading] = useState(true);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [clientNotifications, setClientNotifications] = useState([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7;

    // --- Profit Calculator State ---
    const [calcAmount, setCalcAmount] = useState(100000);
    const [calcDuration, setCalcDuration] = useState(12);
    const [calcType, setCalcType] = useState('fixed'); // 'fixed' or 'compounded'
    const [calcResult, setCalcResult] = useState({
        fixed: { finalAmount: 0, profit: 0 },
        compounded: { finalAmount: 0, profit: 0 }
    });

    useEffect(() => {
        // Business Logic
        const fixedRate = 0.04; // 4% per month
        // For compounded, approx 52-53% annualized. 
        // Let's use a montly rate that results in ~53% APY. 
        // 1.53^(1/12) - 1 approx 3.6%??? 
        // Client said "Internally use an optimized monthly compound rate".
        // Let's assume a slightly lower monthly rate for compounding to match reasonable expectations or just use the same 4% if that's the base.
        // "Fixed Return: Flat 4% per month (Simple)"
        // "Compounded Return: Monthly compounding... Annualized approx 52-53%"
        // If we use 3.6% monthly compounded: (1.036)^12 = 1.529 -> ~53%. 
        // So let's use 3.6% for compounded.

        const compoundedRate = 0.036;

        // Fixed Calculation (Simple Interest)
        // Profit = P * r * t
        const fixedProfit = calcAmount * fixedRate * calcDuration;
        const fixedFinal = calcAmount + fixedProfit;

        // Compounded Calculation
        // A = P * (1 + r)^t
        let compoundedFinal = 0;
        let compoundedProfit = 0;

        if (calcDuration > 6) {
            compoundedFinal = calcAmount * Math.pow(1 + compoundedRate, calcDuration);
            compoundedProfit = compoundedFinal - calcAmount;
        }

        setCalcResult({
            fixed: {
                finalAmount: Math.round(fixedFinal),
                profit: Math.round(fixedProfit),
                rate: (fixedRate * 100).toFixed(1) + '%'
            },
            compounded: {
                finalAmount: calcDuration > 6 ? Math.round(compoundedFinal) : 0,
                profit: calcDuration > 6 ? Math.round(compoundedProfit) : 0,
                rate: calcDuration > 6 ? (compoundedRate * 100).toFixed(1) + '%' : 'N/A'
            }
        });

        // Auto-switch to fixed if duration is short
        if (calcDuration <= 6 && calcType === 'compounded') {
            setCalcType('fixed');
        }

    }, [calcAmount, calcDuration, calcType]);

    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [userInfo, setUserInfo] = useState({ name: '', email: '', id: '' });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserInfo({
                    name: payload.name || 'User',
                    email: payload.sub || payload.email,
                    userId: payload.userId || '---'
                });
            } catch (e) {
                console.error('Failed to decode token', e);
            }
        }
    }, []);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setShowNotifications(false);
                setShowUserMenu(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const fetchData = async () => {
        try {
            const [portfolioResult, profitResult, depositsResult, withdrawalsResult, transactionsResult] = await Promise.allSettled([
                portfolioService.getMyPortfolio(),
                profitService.getMyHistory(),
                depositService.getMyRequests(),
                withdrawalService.getMyRequests(),
                clientService.getTransactions()
            ]);

            // Portfolio
            if (portfolioResult.status === 'fulfilled') {
                setPortfolio(portfolioResult.value);
            } else {
                setPortfolio({
                    totalValue: 0,
                    totalInvested: 0,
                    cashBalance: 0,
                    profitPercentage: 0,
                    profitAccrualStatus: 'PAUSED',
                    nextEstimatedPayout: 0
                });
            }

            // Profit History
            if (profitResult.status === 'fulfilled') {
                setProfitHistory(profitResult.value.sort((a, b) => (a.year - b.year) || (a.month - b.month)));
            }

            // Merge History - Only Deposits and Withdrawals
            let allHistory = [];
            if (depositsResult.status === 'fulfilled') {
                const deposits = depositsResult.value.map(d => ({ ...d, type: 'DEPOSIT' }));
                allHistory = [...allHistory, ...deposits];
            }
            if (withdrawalsResult.status === 'fulfilled') {
                const withdrawals = withdrawalsResult.value.map(w => ({ ...w, type: 'WITHDRAWAL' }));
                allHistory = [...allHistory, ...withdrawals];
            }

            // Add completed Deposits/Withdrawals from transactions (if any)
            if (transactionsResult.status === 'fulfilled') {
                const completedTransactions = transactionsResult.value
                    .filter(t => t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL')
                    .map(t => ({
                        ...t,
                        createdAt: t.date || t.createdAt || t.timestamp
                    }));
                allHistory = [...allHistory, ...completedTransactions];
            }

            // Handle Transactions: Payouts go to Profit History, others might strictly be ignored or handled if needed
            // But per request "Profit actions in profit summary", so remove PAYOUT from main history

            let payouts = [];
            if (transactionsResult.status === 'fulfilled') {
                payouts = transactionsResult.value
                    .filter(t => t.type === 'PAYOUT')
                    .map(t => ({
                        calculatedAt: t.date || t.createdAt || t.timestamp,
                        profitAmount: t.amount,
                        type: 'PAYOUT',
                        isPayout: true,
                        // map other fields to match profit history structure
                        year: new Date(t.date || t.createdAt).getFullYear(),
                        month: new Date(t.date || t.createdAt).getMonth() + 1
                    }));
            }

            // Update Profit History with Payouts
            if (profitResult.status === 'fulfilled') {
                // Merge database profit history with transaction payouts
                // We prefer payouts from transactions as they are actual money movements
                // But we might have duplicates if profit history is just a log. 
                // Assuming profitHistory is the 'monthly record' and payouts are 'actual payments'.
                // If we just want to SHOW them in the Profit Summary card:
                const combined = [...profitResult.value, ...payouts];
                combined.sort((a, b) => new Date(b.calculatedAt || b.createdAt) - new Date(a.calculatedAt || a.createdAt));
                setProfitHistory(combined);
            } else {
                setProfitHistory(payouts);
            }

            // Sort by Date Descending
            allHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setHistory(allHistory);
            setFilteredHistory(allHistory);

            // --- Notifications Logic ---
            // Notifications are recent COMPLETED or REJECTED requests, and all PAYOUTS
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

            const recentUpdates = allHistory.filter(item => {
                const itemDate = new Date(item.createdAt);
                // Status updates (Approved/Rejected) or Payouts
                const isUpdate = (item.type === 'DEPOSIT' || item.type === 'WITHDRAWAL') && item.status !== 'PENDING';
                const isPayout = item.type === 'PAYOUT';

                return (isUpdate || isPayout) && itemDate > threeDaysAgo;
            });

            setClientNotifications(recentUpdates);
            setUnreadNotifications(recentUpdates.length);

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleOpenDeposit = () => setShowDepositModal(true);
        const handleOpenWithdrawal = () => setShowWithdrawalModal(true);

        window.addEventListener('open-deposit', handleOpenDeposit);
        window.addEventListener('open-withdrawal', handleOpenWithdrawal);

        return () => {
            window.removeEventListener('open-deposit', handleOpenDeposit);
            window.removeEventListener('open-withdrawal', handleOpenWithdrawal);
        };
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (filterType === 'ALL') {
            setFilteredHistory(history);
        } else {
            setFilteredHistory(history.filter(h => h.type === filterType));
        }
        setCurrentPage(1);
    }, [filterType, history]);

    const handleWithdrawalSuccess = () => fetchData();
    const handleDepositSuccess = () => fetchData();

    const handleCopyMessage = (message) => {
        navigator.clipboard.writeText(message);
        // Optional: you could set a 'copied' state for feedback, but for simplicity assuming it works
        alert('Message copied to clipboard!');
    };

    const handleLogout = () => {
        authService.logout();
        navigate('/login', { replace: true });
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                background: 'var(--bg-app)',
                color: 'var(--text-main)'
            }}>
                <div className="animate-spin" style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(99, 102, 241, 0.2)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%',
                    marginBottom: '16px'
                }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
            </div>
        );
    }

    // Calculations
    const grossInvested = portfolio?.totalInvested || 0;
    const approvedWithdrawalsAmount = history
        .filter(h => h.type === 'WITHDRAWAL' && h.status === 'APPROVED')
        .reduce((sum, item) => sum + item.amount, 0);

    const netInvestment = Math.max(0, grossInvested - approvedWithdrawalsAmount);
    const totalEarnedValue = portfolio?.totalValue || 0;
    const profitEarned = totalEarnedValue - netInvestment;

    // Next Profit Snapshot Calculation
    const nextProfitBase = netInvestment;
    // Use the backend-provided estimation if available, else 0.
    const nextProfitAmount = portfolio?.nextEstimatedPayout || 0;
    const nextProfitDate = new Date();
    nextProfitDate.setMonth(nextProfitDate.getMonth() + 1);
    nextProfitDate.setDate(1); // 1st of next month

    // Removed pieData as it is no longer used

    // Styles
    const containerStyle = {
        padding: '32px',
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: '100vh',
        color: '#f8fafc'
    };

    const glassPanelStyle = {
        background: 'rgba(30, 41, 59, 0.4)',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '24px',
        transition: 'all 0.3s ease'
    };

    const buttonStyle = {
        padding: '12px 24px',
        borderRadius: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        border: 'none',
        outline: 'none'
    };

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    return (
        <div className="animate-fade-in dashboard-container" style={containerStyle}>

            {/* Mobile Header */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
                        <Menu size={24} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '16px' }}>
                            Hello {userInfo.name.split(' ')[0]},
                        </span>
                        {/* <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>
                            Track your growth here
                        </span> */}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => {
                                setShowNotifications(!showNotifications);
                                setShowUserMenu(false);
                            }}
                            style={{
                                position: 'relative',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'rgba(30, 41, 59, 0.8)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: unreadNotifications > 0 ? '#6366f1' : '#94a3b8',
                                cursor: 'pointer'
                            }}
                        >
                            <Bell size={18} />
                            {unreadNotifications > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '4px',
                                    right: '4px',
                                    width: '8px',
                                    height: '8px',
                                    background: '#f43f5e',
                                    border: '2px solid rgba(30, 41, 59, 1)',
                                    borderRadius: '50%',
                                    display: 'block'
                                }} />
                            )}
                        </button>

                        {showNotifications && (
                            <div style={{
                                position: 'fixed',
                                top: '64px',
                                left: '16px',
                                right: '16px',
                                background: '#1e293b',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '16px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                                zIndex: 10000,
                                overflow: 'hidden',
                                animation: 'scaleIn 0.2s ease-out',
                                maxWidth: '350px',
                                margin: '0 auto'
                            }}>
                                <div style={{ padding: '16px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: '600' }}>Updates</h3>
                                    <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                                        {clientNotifications.length} New
                                    </span>
                                </div>
                                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                    {clientNotifications.length === 0 ? (
                                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                            <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                            <p style={{ margin: 0, fontSize: '14px' }}>No recent updates</p>
                                        </div>
                                    ) : (
                                        clientNotifications.map((n, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: n.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' :
                                                            n.type === 'PAYOUT' ? 'rgba(99, 102, 241, 0.1)' :
                                                                n.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.1)' :
                                                                    'rgba(148, 163, 184, 0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: n.type === 'DEPOSIT' ? '#10b981' :
                                                            n.type === 'PAYOUT' ? '#6366f1' :
                                                                n.status === 'REJECTED' ? '#f43f5e' :
                                                                    '#94a3b8',
                                                        flexShrink: 0
                                                    }}>
                                                        {n.type === 'PAYOUT' ? '₹' : (n.status === 'REJECTED' ? '!' : (n.type === 'DEPOSIT' ? '+' : '-'))}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                                                                {n.type === 'PAYOUT' ? 'Profit Payout' :
                                                                    `${(n.type || '').charAt(0)}${(n.type || '').slice(1).toLowerCase()} ${(n.status || '').charAt(0)}${(n.status || '').slice(1).toLowerCase()}`}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                                                            {n.type === 'PAYOUT' ? `Received ₹${(n.amount || 0).toLocaleString()}` :
                                                                `Your request for ₹${(n.amount || 0).toLocaleString()} was ${(n.status || 'unknown').toLowerCase()}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Icon */}
                    <button
                        onClick={() => {
                            setShowUserMenu(!showUserMenu);
                            setShowNotifications(false);
                        }}
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontWeight: 'bold',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
                    </button>
                </div>
            </div>

            {/* Mobile Action Buttons - Always Visible */}
            <div className="mobile-action-buttons" style={{
                marginTop: '35px',
                padding: '16px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                display: 'flex',
                gap: '12px',
                position: 'relative',
                zIndex: 10
            }}>
                <button
                    onClick={() => setShowWithdrawalModal(true)}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: '#ef4444',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <ArrowDownLeft size={16} />
                    Withdraw
                </button>
                <button
                    onClick={() => setShowDepositModal(true)}
                    style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                    }}
                >
                    <ArrowUpRight size={16} />
                    Add Funds
                </button>
            </div>

            {/* Mobile User Menu Dropdown */}
            {
                showUserMenu && (
                    <div style={{
                        position: 'fixed',
                        top: '70px',
                        right: '16px',
                        background: '#1e293b',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '12px',
                        padding: '8px',
                        minWidth: '200px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                        zIndex: 9999,
                        animation: 'scaleIn 0.2s ease-out'
                    }} className="mobile-user-dropdown">
                        <button
                            onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '14px',
                                transition: 'background 0.2s',
                                marginBottom: '2px'
                            }}
                        >
                            <UserCircle size={16} />
                            Profile
                        </button>

                        <button
                            onClick={() => { setShowUserMenu(false); setShowChangePasswordModal(true); }}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '14px',
                                transition: 'background 0.2s'
                            }}
                        >
                            <KeyRound size={16} />
                            Change Password
                        </button>

                        <div style={{ height: '1px', background: 'rgba(148, 163, 184, 0.1)', margin: '4px 0' }} />

                        <button
                            onClick={handleLogout}
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fb7185',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '14px',
                                transition: 'background 0.2s'
                            }}
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                )
            }

            <PayoutPreviewModal
                show={!!selectedPayout}
                onClose={() => setSelectedPayout(null)}
                payout={selectedPayout}
            />
            {/* Mobile Drawer Overlay */}
            {mobileMenuOpen && <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)} />}

            {/* Mobile Drawer */}
            <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
                <Sidebar mobile={true} onClose={() => setMobileMenuOpen(false)} />
            </div>

            {/* --- Header & User Controls --- */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
                gap: '24px'
            }} className="desktop-header-section">
                <div>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        marginBottom: '8px',
                        background: 'linear-gradient(to right, #ffffff, #94a3b8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Hello {userInfo.name.split(' ')[0]},
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px' }}>Track your capital, profits, and monthly growths</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {/* Deposit / Withdraw Buttons */}
                    <button
                        onClick={() => setShowWithdrawalModal(true)}
                        style={{
                            ...buttonStyle,
                            background: '#ef4444',
                            border: '1px solid #ef4444',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#dc2626';
                            e.currentTarget.style.borderColor = '#dc2626';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ef4444';
                            e.currentTarget.style.borderColor = '#ef4444';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <ArrowDownLeft size={18} color="#ffffff" />
                        <span>Withdraw</span>
                    </button>
                    <button
                        onClick={() => setShowDepositModal(true)}
                        style={{
                            ...buttonStyle,
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <ArrowUpRight size={18} />
                        <span>Add Funds</span>
                    </button>

                    {/* Notification Bell - Moved beside profile */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => {
                                setShowNotifications(!showNotifications);
                                setShowUserMenu(false);
                            }}
                            style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: 'rgba(30, 41, 59, 1)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: unreadNotifications > 0 ? '#6366f1' : '#94a3b8',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                                e.currentTarget.style.background = 'rgba(30, 41, 59, 1)';
                            }}
                        >
                            <Bell size={20} />
                            {unreadNotifications > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '6px',
                                    width: '10px',
                                    height: '10px',
                                    background: '#f43f5e',
                                    border: '2px solid rgba(30, 41, 59, 1)',
                                    borderRadius: '50%',
                                    display: 'block'
                                }} />
                            )}
                        </button>

                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 12px)',
                                right: 0,
                                width: '320px',
                                background: '#1e293b',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '16px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                                zIndex: 100,
                                overflow: 'hidden',
                                animation: 'scaleIn 0.2s ease-out'
                            }}>
                                <div style={{ padding: '16px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: '600' }}>Updates</h3>
                                    <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                                        {clientNotifications.length} New
                                    </span>
                                </div>
                                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                    {clientNotifications.length === 0 ? (
                                        <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                            <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                            <p style={{ margin: 0, fontSize: '14px' }}>No recent updates</p>
                                        </div>
                                    ) : (
                                        clientNotifications.map((n, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        background: n.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' :
                                                            n.type === 'PAYOUT' ? 'rgba(99, 102, 241, 0.1)' :
                                                                n.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.1)' :
                                                                    'rgba(148, 163, 184, 0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: n.type === 'DEPOSIT' ? '#10b981' :
                                                            n.type === 'PAYOUT' ? '#6366f1' :
                                                                n.status === 'REJECTED' ? '#f43f5e' :
                                                                    '#94a3b8',
                                                        flexShrink: 0
                                                    }}>
                                                        {n.type === 'PAYOUT' ? '₹' : (n.status === 'REJECTED' ? '!' : (n.type === 'DEPOSIT' ? '+' : '-'))}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                                                                {n.type === 'PAYOUT' ? 'Profit Payout' :
                                                                    `${(n.type || '').charAt(0)}${(n.type || '').slice(1).toLowerCase()} ${(n.status || '').charAt(0)}${(n.status || '').slice(1).toLowerCase()}`}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                                                            {n.type === 'PAYOUT' ? `Received ₹${(n.amount || 0).toLocaleString()}` :
                                                                `Your request for ₹${(n.amount || 0).toLocaleString()} was ${(n.status || 'unknown').toLowerCase()}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>



                    {/* Account Controls - User Dropdown */}
                    <div style={{ position: 'relative' }} className="desktop-user-menu">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: 'rgba(30, 41, 59, 1)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '9999px',
                                padding: '8px 16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                minWidth: '180px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#6366f1';
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '14px',
                                flexShrink: 0
                            }}>
                                {userInfo.name.charAt(0).toUpperCase()}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                                <span style={{
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    color: '#f8fafc',
                                    lineHeight: '1.2'
                                }}>
                                    {userInfo.userId}
                                </span>
                                <span style={{
                                    fontSize: '12px',
                                    color: '#94a3b8',
                                    fontWeight: '500'
                                }}>
                                    {userInfo.name}
                                </span>
                            </div>

                            <ChevronDown size={16} color="#94a3b8" />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                background: '#1e293b',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '12px',
                                padding: '8px',
                                width: '100%',
                                minWidth: '200px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                zIndex: 100,
                                animation: 'scaleIn 0.2s ease-out'
                            }}>
                                <button
                                    onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        transition: 'background 0.2s',
                                        marginBottom: '2px'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <UserCircle size={16} />
                                    Profile
                                </button>

                                <button
                                    onClick={() => { setShowUserMenu(false); setShowChangePasswordModal(true); }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#cbd5e1',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <KeyRound size={16} />
                                    Change Password
                                </button>

                                <div style={{ height: '1px', background: 'rgba(148, 163, 184, 0.1)', margin: '4px 0' }} />

                                <button
                                    onClick={handleLogout}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#fb7185',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(244, 63, 94, 0.1)';
                                        e.currentTarget.style.color = '#f43f5e';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#fb7185';
                                    }}
                                >
                                    <LogOut size={16} />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* --- Stats Grid --- */}
            <div className="dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '24px',
                marginBottom: '40px'
            }}>
                {/* 1. Capital Invested */}
                <div style={glassPanelStyle} className="hover-lift">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Capital Invested
                            </p>
                            <h3 style={{ fontSize: '30px', fontWeight: '700', fontFamily: 'monospace', color: '#fff' }}>
                                ₹{(portfolio?.totalInvested || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#818cf8' }}>
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#a5b4fc',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                        Principal Amount
                    </div>
                </div>

                {/* 2. Next Estimated Payout (New Card Position) */}
                <div style={glassPanelStyle} className="hover-lift">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Next Estimated Payout
                            </p>
                            <h3 style={{ fontSize: '30px', fontWeight: '700', fontFamily: 'monospace', color: '#6ee7b7' }}>
                                ₹{nextProfitAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', color: '#34d399' }}>
                            <CalendarClock size={24} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#cbd5e1',
                            background: 'rgba(255, 255, 255, 0.05)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(148, 163, 184, 0.1)'
                        }}>
                            Credit: {nextProfitDate.toLocaleString('default', { month: 'short' })} 5 – {nextProfitDate.toLocaleString('default', { month: 'short' })} 10
                        </div>
                        <div style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#6ee7b7',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            {portfolio?.profitPercentage ? `${portfolio.profitPercentage}% return` : '4% return'}
                        </div>
                    </div>
                </div>

                {/* 3. Available Profit */}
                <div style={glassPanelStyle} className="hover-lift">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Available Profit
                            </p>
                            <h3 style={{
                                fontSize: '30px',
                                fontWeight: '700',
                                fontFamily: 'monospace',
                                color: '#fbbf24'
                            }}>
                                ₹{Math.floor(portfolio?.availableProfit || 0).toLocaleString()}
                            </h3>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(251, 191, 36, 0.1)', borderRadius: '12px', color: '#fbbf24' }}>
                            <span style={{ fontSize: '24px', lineHeight: '1', display: 'block' }}>💰</span>
                        </div>
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: 'rgba(251, 191, 36, 0.1)',
                        color: '#fcd34d',
                        border: '1px solid rgba(251, 191, 36, 0.2)'
                    }}>
                        Withdrawable Balance
                    </div>
                </div>

                {/* 4. Current Balance */}
                <div style={{
                    ...glassPanelStyle,
                    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    boxShadow: '0 8px 32px rgba(99, 102, 241, 0.1)'
                }} className="hover-lift">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <p style={{ color: '#a5b4fc', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                Current Balance
                            </p>
                            <h3 style={{ fontSize: '36px', fontWeight: '700', fontFamily: 'monospace', color: '#fff' }}>
                                ₹{Math.floor((portfolio?.totalInvested || 0) + (portfolio?.availableProfit || 0)).toLocaleString()}
                            </h3>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '12px', color: '#fff' }}>
                            <span style={{ fontSize: '24px', lineHeight: '1', display: 'block' }}>💸</span>
                        </div>
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#f8fafc',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        Total Usable Amount
                    </div>
                </div>


            </div>

            {/* --- Charts Section --- */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '24px',
                marginBottom: '40px'
            }}>
                {/* Monthly Profit */}
                {/* Profit Calculator */}
                < div style={glassPanelStyle} >
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={20} color="#6366f1" />
                        Profit Calculator
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Inputs Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Investment Amount (₹)</label>
                                <input
                                    type="number"
                                    value={calcAmount}
                                    onChange={(e) => setCalcAmount(Number(e.target.value))}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(30, 41, 59, 0.5)',
                                        border: '1px solid rgba(148, 163, 184, 0.2)',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Duration (Months)</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={calcDuration}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === '') setCalcDuration('');
                                            else if (/^\d+$/.test(val)) setCalcDuration(parseInt(val, 10));
                                        }}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(30, 41, 59, 0.5)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            padding: '10px 12px',
                                            paddingRight: '36px',
                                            borderRadius: '8px',
                                            color: '#fff',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        right: '4px',
                                        top: '4px',
                                        bottom: '4px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                    }}>
                                        <button
                                            onClick={() => setCalcDuration(prev => (prev === '' ? 0 : prev) + 1)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '3px',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                padding: '0 6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <ChevronUp size={10} />
                                        </button>
                                        <button
                                            onClick={() => setCalcDuration(prev => Math.max(0, (prev === '' ? 0 : prev) - 1))}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                background: 'rgba(255,255,255,0.05)',
                                                borderRadius: '3px',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                padding: '0 6px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        >
                                            <ChevronDown size={10} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mode Selection & Message */}
                        <div>
                            <div style={{ display: 'flex', gap: '16px', background: 'rgba(30, 41, 59, 0.5)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                                <button
                                    onClick={() => setCalcType('fixed')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '6px',
                                        background: calcType === 'fixed' ? '#6366f1' : 'transparent',
                                        color: calcType === 'fixed' ? 'white' : '#94a3b8',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Fixed Monthly Return
                                </button>
                                <button
                                    onClick={() => calcDuration > 6 && setCalcType('compounded')}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        borderRadius: '6px',
                                        background: calcType === 'compounded' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                                        color: calcType === 'compounded' ? 'white' : (calcDuration > 6 ? '#94a3b8' : 'rgba(148, 163, 184, 0.4)'),
                                        border: 'none',
                                        cursor: calcDuration > 6 ? 'pointer' : 'not-allowed',
                                        fontWeight: '600',
                                        fontSize: '13px',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                >
                                    Compounded Return
                                    {calcDuration <= 6 && <span style={{ position: 'absolute', top: '-8px', right: '-4px', background: '#f87171', color: 'white', fontSize: '9px', padding: '2px 4px', borderRadius: '4px' }}>Min 7M</span>}
                                </button>
                            </div>
                            <div style={{ marginTop: '12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></div>
                                Compounding rewards patience. The longer you stay invested, the faster growth accelerates.
                            </div>
                        </div>

                        {/* Comparison Results */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                            {/* Fixed Card */}
                            <div style={{
                                background: calcType === 'fixed' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(30, 41, 59, 0.3)',
                                border: `1px solid ${calcType === 'fixed' ? '#6366f1' : 'rgba(148, 163, 184, 0.1)'}`,
                                borderRadius: '12px',
                                padding: '16px',
                                transition: 'all 0.2s'
                            }}>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Fixed Profit</div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', fontFamily: 'monospace' }}>₹{calcResult.fixed.profit.toLocaleString()}</div>
                                <div style={{ fontSize: '11px', color: '#6366f1', marginTop: '4px' }}>Total: ₹{calcResult.fixed.finalAmount.toLocaleString()}</div>
                            </div>

                            {/* Compounded Card */}
                            <div style={{
                                background: calcType === 'compounded' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 41, 59, 0.3)',
                                border: `1px solid ${calcType === 'compounded' ? '#10b981' : 'rgba(148, 163, 184, 0.1)'}`,
                                borderRadius: '12px',
                                padding: '16px',
                                transition: 'all 0.2s',
                                opacity: calcDuration > 6 ? 1 : 0.5
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Compounded</span>
                                    {calcDuration > 6 && <TrendingUp size={12} color="#10b981" />}
                                </div>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', fontFamily: 'monospace' }}>
                                    {calcDuration > 6 ? `₹${calcResult.compounded.profit.toLocaleString()}` : '---'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                    {calcDuration > 6 ? `Total: ₹${calcResult.compounded.finalAmount.toLocaleString()}` : 'Min 7 months required'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div >

                {/* Profit Summary */}
                <div style={{ ...glassPanelStyle, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                                <CalendarClock size={20} color="#6366f1" />
                                Profit Summary
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>Total Net Profit (Till Date)</p>
                        </div>
                        <h2 style={{ fontSize: '38px', fontWeight: '700', color: '#10b981', fontFamily: 'monospace', letterSpacing: '-1px', marginRight: '24px' }}>
                            ₹{(() => {
                                if (!profitHistory || profitHistory.length === 0) return (0).toLocaleString();
                                return profitHistory.reduce((acc, curr) => acc + (curr.profitAmount || 0), 0).toLocaleString();
                            })()}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

                        {/* Monthly Profit History */}
                        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                            {profitHistory && profitHistory.length > 0 ? (
                                (() => {
                                    let runningTotal = 0;
                                    // Sort by date ascending to calculate running total correctly
                                    const sorted = [...profitHistory].sort((a, b) => (a.year - b.year) || (a.month - b.month));
                                    // Compute cumulative
                                    const withCumulative = sorted.map(item => {
                                        runningTotal += (item.profitAmount || 0);
                                        return { ...item, cumulativeTotal: runningTotal };
                                    }).reverse(); // Reverse to show latest first

                                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {withCumulative.map((item, idx) => (
                                                <div key={idx} style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1.2fr 1fr 1fr',
                                                    alignItems: 'center',
                                                    padding: '12px',
                                                    background: 'rgba(30, 41, 59, 0.4)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(148, 163, 184, 0.05)',
                                                    fontSize: '13px'
                                                }}>
                                                    {/* Month & Year */}
                                                    <div style={{ color: '#cbd5e1', fontWeight: '500' }}>
                                                        {monthNames[item.month - 1]} {item.year}
                                                    </div>

                                                    {/* Monthly Profit */}
                                                    <div style={{ color: '#10b981', fontWeight: '600', fontFamily: 'monospace' }}>
                                                        +₹{(item.profitAmount || 0).toLocaleString()}
                                                    </div>

                                                    {/* Total Net Profit */}
                                                    <div style={{ color: '#fff', fontWeight: '700', fontFamily: 'monospace', textAlign: 'right' }}>
                                                        ₹{item.cumulativeTotal.toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()
                            ) : (
                                <p style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', padding: '8px 0' }}>No profit history yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div >

            {/* --- Recent History --- */}
            <div id="history-section" style={{ ...glassPanelStyle, padding: 0 }}>
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <History size={20} color="#818cf8" />
                        History
                    </h3>

                    {/* Filter */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                paddingLeft: '12px',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '8px',
                                color: '#e2e8f0',
                                fontSize: '14px',
                                cursor: 'pointer',
                                minWidth: '180px',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={16} color="#94a3b8" />
                                <span>
                                    {filterType === 'ALL' ? 'All Transactions' :
                                        filterType === 'DEPOSIT' ? 'Deposits Only' :
                                            filterType === 'WITHDRAWAL' ? 'Withdrawals Only' : 'Payouts Only'}
                                </span>
                            </div>
                            <ChevronDown size={14} color="#94a3b8" />
                        </button>

                        {showFilterMenu && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                background: '#1e293b',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '8px',
                                padding: '4px',
                                zIndex: 50,
                                minWidth: '180px',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                animation: 'scaleIn 0.2s ease-out'
                            }}>
                                {[
                                    { label: 'All Transactions', value: 'ALL' },
                                    { label: 'Deposits Only', value: 'DEPOSIT' },
                                    { label: 'Withdrawals Only', value: 'WITHDRAWAL' },
                                    { label: 'Payouts Only', value: 'PAYOUT' }
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => { setFilterType(opt.value); setShowFilterMenu(false); }}
                                        style={{
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: '8px 12px',
                                            background: filterType === opt.value ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                            color: filterType === opt.value ? '#818cf8' : '#cbd5e1',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            fontWeight: filterType === opt.value ? '600' : '400',
                                            marginBottom: '2px',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (filterType !== opt.value) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (filterType !== opt.value) e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.3)', color: '#94a3b8', textTransform: 'uppercase', fontSize: '12px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                <th style={{ padding: '16px', fontWeight: '600', width: '15%', textAlign: 'center' }}>Type</th>
                                <th style={{ padding: '16px', fontWeight: '600', width: '12%', textAlign: 'center' }}>Amount</th>
                                <th style={{ padding: '16px', fontWeight: '600', width: '12%', textAlign: 'center' }}>Payment Mode</th>
                                <th style={{ padding: '16px', fontWeight: '600', width: '12%', textAlign: 'center' }}>Status</th>
                                <th style={{ padding: '16px', fontWeight: '600', width: '18%', textAlign: 'center' }}>Date</th>
                                <th style={{ padding: '16px', fontWeight: '600', width: '5%', textAlign: 'center' }}>Details</th>
                                <th style={{ padding: '16px', fontWeight: '600', width: '26%', textAlign: 'center' }}>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                        No transactions found for this filter.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.05)', transition: 'background 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td data-label="Type" style={{ padding: '16px', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {item.type === 'DEPOSIT' ? <ArrowUpRight size={14} color="#10b981" /> :
                                                        item.type === 'WITHDRAWAL' ? <ArrowDownLeft size={14} color="#f43f5e" /> :
                                                            <Banknote size={14} color="#6366f1" />}
                                                    <span style={{ fontSize: '12px', color: '#fff', fontWeight: '500' }}>
                                                        {item.type === 'DEPOSIT' ? 'Funds Added' : item.type}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Amount" style={{ padding: '16px', textAlign: 'center', fontFamily: 'monospace', fontSize: '14px', fontWeight: '600', color: '#fff' }}>
                                            {item.type === 'DEPOSIT' ? '+' : '-'}₹{item.amount.toLocaleString()}
                                        </td>
                                        <td data-label="Payment Mode" style={{ padding: '16px', color: '#94a3b8', textAlign: 'center' }}>
                                            {item.paymentMode || '-'}
                                        </td>
                                        <td data-label="Status" style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-flex',
                                                padding: '4px 8px',
                                                borderRadius: '20px',
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                textTransform: 'uppercase',
                                                border: '1px solid',
                                                background: item.status === 'APPROVED' || item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.05)' : item.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.05)' : 'rgba(251, 191, 36, 0.05)',
                                                color: item.status === 'APPROVED' || item.status === 'COMPLETED' ? '#34d399' : item.status === 'REJECTED' ? '#fb7185' : '#fbbf24',
                                                borderColor: item.status === 'APPROVED' || item.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.2)' : item.status === 'REJECTED' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(251, 191, 36, 0.2)'
                                            }}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td data-label="Date" style={{ padding: '16px', color: '#e2e8f0', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                <span style={{ fontSize: '13px' }}>{new Date(item.createdAt).toLocaleDateString('en-GB')}</span>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            {item.type === 'PAYOUT' && (
                                                <button
                                                    onClick={() => setSelectedPayout(item)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'None',
                                                        cursor: 'pointer',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        color: '#818cf8',
                                                        transition: 'all 0.2s',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                                        e.currentTarget.style.transform = 'scale(1.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                    title="View Payout Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            )}
                                        </td>
                                        <td data-label="Remarks" style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                {item.remarks || item.note || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredHistory.length > itemsPerPage && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        padding: '16px 24px',
                        gap: '12px',
                        borderTop: '1px solid rgba(148, 163, 184, 0.1)'
                    }}>
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: currentPage === 1 ? 'rgba(148, 163, 184, 0.05)' : 'rgba(30, 41, 59, 0.6)',
                                color: currentPage === 1 ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0',
                                border: '1px solid',
                                borderColor: currentPage === 1 ? 'transparent' : 'rgba(148, 163, 184, 0.2)',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>

                        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500', minWidth: '80px', textAlign: 'center' }}>
                            Page {currentPage} of {totalPages}
                        </span>

                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: currentPage === totalPages ? 'rgba(148, 163, 184, 0.05)' : 'rgba(30, 41, 59, 0.6)',
                                color: currentPage === totalPages ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0',
                                border: '1px solid',
                                borderColor: currentPage === totalPages ? 'transparent' : 'rgba(148, 163, 184, 0.2)',
                                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                fontSize: '13px',
                                fontWeight: '500',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div >

            {/* Modals */}
            <WithdrawalRequestModal
                show={showWithdrawalModal}
                onClose={() => setShowWithdrawalModal(false)}
                portfolio={portfolio}
                onSuccess={handleWithdrawalSuccess}
            />

            <DepositRequestModal
                show={showDepositModal}
                onClose={() => setShowDepositModal(false)}
                portfolio={portfolio}
                onSuccess={handleDepositSuccess}
            />

            <ChangePasswordModal
                show={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />

            <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                userInfo={userInfo}
                portfolio={portfolio}
            />

            <PayoutPreviewModal
                show={!!selectedPayout}
                onClose={() => setSelectedPayout(null)}
                payout={selectedPayout}
            />
        </div >
    );
};

export default ClientDashboard;
