import React, { useState, useEffect, useMemo } from 'react';
import { adminService, mediatorService } from '../services/api';
import { ArrowUpRight, ArrowDownLeft, Banknote, CirclePlus, CircleMinus, History, Eye } from 'lucide-react';
import UserIdBadge from '../components/UserIdBadge';
import DepositRequestModal from '../components/DepositRequestModal';
import WithdrawalRequestModal from '../components/WithdrawalRequestModal';
import PayoutModal from '../components/PayoutModal';
import ClientHistoryModal from '../components/ClientHistoryModal';


const ClientOverviewDashboard = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'clientName', direction: 'ascending' });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);

    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            setUserRole(role);
        }
    }, []);

    useEffect(() => {
        if (userRole) {
            fetchData();
        }
    }, [userRole]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const isMediator = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';
            let data = [];

            if (isMediator) {
                data = await mediatorService.getPortfolios();
            } else {
                data = await adminService.getAllClientsSummary();
            }
            setClients(data);
        } catch (error) {
            console.error("Failed to fetch client summaries", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeedClients = async () => {
        try {
            setSeeding(true);
            const response = await adminService.seedSampleClients();
            console.log(response.message);
            await fetchData();
        } catch (error) {
            console.error("Failed to seed clients", error);
        } finally {
            setSeeding(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredClients = useMemo(() => {
        let sortableItems = [...clients];

        if (filter) {
            sortableItems = sortableItems.filter(client =>
                client.clientName?.toLowerCase().includes(filter.toLowerCase()) ||
                client.email?.toLowerCase().includes(filter.toLowerCase()) ||
                client.userId?.toLowerCase().includes(filter.toLowerCase())
            );
        }

        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return sortableItems;
    }, [clients, sortConfig, filter]);

    const totalPages = Math.ceil(sortedAndFilteredClients.length / itemsPerPage);
    const paginatedClients = sortedAndFilteredClients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalClients = clients.length;
    const totalAUM = clients.reduce((acc, curr) => acc + (Number(curr.currentValue) || 0), 0);
    const totalProfitLoss = clients.reduce((acc, curr) => acc + (Number(curr.availableProfit) || 0), 0);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    const formatPercentage = (value) => {
        const num = Number(value) || 0;
        return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '⇅';
        return sortConfig.direction === 'ascending' ? '↑' : '↓';
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div className="animate-spin" style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid rgba(99, 102, 241, 0.2)',
                    borderTopColor: '#6366f1',
                    borderRadius: '50%'
                }}></div>
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading client data...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }} className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '8px',
                    letterSpacing: '-0.5px'
                }}>
                    Client Portfolio Overview
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                    Monitor performance metrics and manage client portfolios
                </p>
            </div>

            {/* KPI Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                {/* Total Clients Card */}
                <div style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
                    }}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '80px',
                        opacity: '0.1'
                    }}>👥</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>Total Clients</p>
                        <h3 style={{
                            fontSize: '36px',
                            fontWeight: '700',
                            color: '#ffffff',
                            marginBottom: '8px'
                        }}>{totalClients}</h3>
                        <div style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: '#a5b4fc',
                            fontWeight: '600'
                        }}>Active Portfolios</div>
                    </div>
                </div>

                {/* Total AUM Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.1)';
                    }}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '80px',
                        opacity: '0.15'
                    }}>💰</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>Total Balance</p>
                        <h3 style={{
                            fontSize: '36px',
                            fontWeight: '700',
                            color: '#34d399',
                            marginBottom: '8px',
                            fontFamily: 'monospace'
                        }}>{formatCurrency(totalAUM)}</h3>
                        <div style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: '#6ee7b7',
                            fontWeight: '600'
                        }}>Assets Under Management</div>
                    </div>
                </div>

                {/* Total P/L Card */}
                <div style={{
                    background: totalProfitLoss >= 0
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(30, 41, 59, 0.8) 100%)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    padding: '24px',
                    border: totalProfitLoss >= 0
                        ? '1px solid rgba(16, 185, 129, 0.2)'
                        : '1px solid rgba(239, 68, 68, 0.2)',
                    boxShadow: totalProfitLoss >= 0
                        ? '0 4px 20px rgba(16, 185, 129, 0.1)'
                        : '0 4px 20px rgba(239, 68, 68, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = totalProfitLoss >= 0
                            ? '0 8px 30px rgba(16, 185, 129, 0.2)'
                            : '0 8px 30px rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = totalProfitLoss >= 0
                            ? '0 4px 20px rgba(16, 185, 129, 0.1)'
                            : '0 4px 20px rgba(239, 68, 68, 0.1)';
                    }}>
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        fontSize: '80px',
                        opacity: '0.15'
                    }}>{totalProfitLoss >= 0 ? '📈' : '📉'}</div>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <p style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: '12px'
                        }}>Total Profit</p>
                        <h3 style={{
                            fontSize: '36px',
                            fontWeight: '700',
                            color: totalProfitLoss >= 0 ? '#34d399' : '#f87171',
                            marginBottom: '8px',
                            fontFamily: 'monospace'
                        }}>
                            {totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(totalProfitLoss)}
                        </h3>
                        <div style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            background: totalProfitLoss >= 0
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '20px',
                            fontSize: '11px',
                            color: totalProfitLoss >= 0 ? '#6ee7b7' : '#fca5a5',
                            fontWeight: '600'
                        }}>
                            {totalProfitLoss >= 0 ? 'Profit' : 'Loss'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {clients.length === 0 ? (
                <div style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    padding: '64px 32px',
                    border: '2px dashed rgba(148, 163, 184, 0.2)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
                    <h3 style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#ffffff',
                        marginBottom: '8px'
                    }}>No Clients Found</h3>
                    <p style={{
                        color: '#94a3b8',
                        marginBottom: '24px',
                        maxWidth: '400px',
                        margin: '0 auto 24px'
                    }}>
                        Get started by creating sample clients to see the dashboard in action
                    </p>
                    {!(userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') && (
                        <button
                            onClick={handleSeedClients}
                            disabled={seeding}
                            style={{
                                padding: '14px 32px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#ffffff',
                                fontSize: '15px',
                                fontWeight: '600',
                                cursor: seeding ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                                transition: 'all 0.3s ease',
                                opacity: seeding ? 0.7 : 1
                            }}
                            onMouseEnter={(e) => {
                                if (!seeding) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 30px rgba(99, 102, 241, 0.5)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
                            }}
                        >
                            {seeding ? 'Generating...' : '✨ Generate Sample Data'}
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Search Bar */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '20px',
                        marginBottom: '24px',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                    }}>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute',
                                left: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '18px',
                                opacity: 0.5
                            }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Search clients by userId or name..."
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    padding: '0 18px 0 48px',
                                    fontSize: '15px',
                                    color: '#f8fafc',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    borderRadius: '12px',
                                    outline: 'none',
                                    transition: 'all 0.3s ease'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#6366f1';
                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* Clients Table */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.8)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table-responsive" style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                tableLayout: 'fixed'
                            }}>
                                <thead>
                                    <tr style={{
                                        background: 'rgba(15, 23, 42, 0.5)',
                                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                                    }}>
                                        <th
                                            onClick={() => handleSort('userId')}
                                            style={{
                                                width: '12%',
                                                padding: '16px 20px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                        >
                                            User ID
                                        </th>
                                        <th
                                            onClick={() => handleSort('clientName')}
                                            style={{
                                                width: '13%',
                                                padding: '16px 20px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                        >
                                            Client
                                        </th>

                                        <th
                                            onClick={() => handleSort('totalInvested')}
                                            style={{
                                                width: '8%',
                                                padding: '16px 20px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                        >
                                            Invested
                                        </th>
                                        <th
                                            onClick={() => handleSort('availableProfit')}
                                            style={{
                                                width: '9%',
                                                padding: '16px 20px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                        >
                                            Profit
                                        </th>
                                        <th
                                            onClick={() => handleSort('currentValue')}
                                            style={{
                                                width: '9%',
                                                padding: '16px 20px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                        >
                                            Value
                                        </th>
                                        <th
                                            onClick={() => handleSort('growthPercentage')}
                                            style={{
                                                width: '9%',
                                                padding: '16px 20px',
                                                textAlign: 'center',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#94a3b8',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1px',
                                                cursor: 'pointer',
                                                userSelect: 'none',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                            onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                                        >
                                            Growth
                                        </th>
                                        <th style={{ width: '15%', padding: '16px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedClients.map((client, index) => (
                                        <tr
                                            key={client.clientId || index}
                                            style={{
                                                borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td data-label="User ID" style={{
                                                padding: '20px',
                                                textAlign: 'center'
                                            }}>
                                                <UserIdBadge userId={client.userId} />
                                            </td>
                                            <td data-label="Client" style={{ padding: '20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{
                                                        fontSize: '15px',
                                                        fontWeight: '500',
                                                        color: '#f8fafc'
                                                    }}>
                                                        {client.clientName}
                                                    </span>
                                                </div>
                                            </td>

                                            <td data-label="Invested" style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                fontSize: '14px',
                                                fontFamily: 'monospace',
                                                color: '#cbd5e1'
                                            }}>
                                                {formatCurrency(client.totalInvested)}
                                            </td>
                                            <td data-label="Profit" style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                fontSize: '15px',
                                                fontFamily: 'monospace',
                                                fontWeight: '600',
                                                color: '#34d399'
                                            }}>
                                                {formatCurrency(client.availableProfit)}
                                            </td>
                                            <td data-label="Value" style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                fontSize: '15px',
                                                fontFamily: 'monospace',
                                                fontWeight: '600',
                                                color: '#f8fafc'
                                            }}>
                                                {formatCurrency(client.currentValue)}
                                            </td>
                                            <td data-label="Growth" style={{ padding: '20px', textAlign: 'center' }}>
                                                {(() => {
                                                    const invested = Number(client.totalInvested) || 0;
                                                    const profit = Number(client.totalProfitEarned) || 0;
                                                    const growth = invested > 0 ? (profit / invested) * 100 : 0;

                                                    return (
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '13px',
                                                            fontFamily: 'monospace',
                                                            fontWeight: '600',
                                                            background: growth >= 0
                                                                ? 'rgba(16, 185, 129, 0.15)'
                                                                : 'rgba(239, 68, 68, 0.15)',
                                                            color: growth >= 0 ? '#6ee7b7' : '#fca5a5',
                                                            border: growth >= 0
                                                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                                                : '1px solid rgba(239, 68, 68, 0.3)'
                                                        }}>
                                                            {formatPercentage(growth)}
                                                        </span>
                                                    );
                                                })()}
                                            </td>

                                            {/* Unified Actions Column */}
                                            <td data-label="Actions" style={{ padding: '20px' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {/* Add Funds */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setShowDepositModal(true);
                                                        }}
                                                        style={{
                                                            padding: '10px',
                                                            background: 'rgba(16, 185, 129, 0.15)',
                                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                                            borderRadius: '10px',
                                                            color: '#34d399',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Add Funds"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <CirclePlus size={18} />
                                                    </button>

                                                    {/* Withdraw */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setShowWithdrawalModal(true);
                                                        }}
                                                        style={{
                                                            padding: '10px',
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            borderRadius: '10px',
                                                            color: '#f87171',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="Withdraw Funds"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <CircleMinus size={18} />
                                                    </button>

                                                    {/* Payout (Admin Only) */}
                                                    {!(userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedClient(client);
                                                                setShowPayoutModal(true);
                                                            }}
                                                            style={{
                                                                padding: '10px',
                                                                background: 'rgba(99, 102, 241, 0.15)',
                                                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                                                borderRadius: '10px',
                                                                color: '#818cf8',
                                                                cursor: 'pointer',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            title="Process Payout"
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                            }}
                                                        >
                                                            <Banknote size={18} />
                                                        </button>
                                                    )}

                                                    {/* History */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClient(client);
                                                            setShowHistoryModal(true);
                                                        }}
                                                        style={{
                                                            padding: '10px',
                                                            background: 'rgba(148, 163, 184, 0.15)',
                                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                                            borderRadius: '10px',
                                                            color: '#cbd5e1',
                                                            cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        title="View History"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(148, 163, 184, 0.25)';
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(148, 163, 184, 0.15)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={{
                                padding: '20px',
                                borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(15, 23, 42, 0.3)'
                            }}>
                                <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                                    Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, sortedAndFilteredClients.length)} of {sortedAndFilteredClients.length} clients
                                </p>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(30, 41, 59, 0.8)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: currentPage === 1 ? '#64748b' : '#cbd5e1',
                                            fontSize: '13px',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(30, 41, 59, 0.8)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: currentPage === totalPages ? '#64748b' : '#cbd5e1',
                                            fontSize: '13px',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <DepositRequestModal
                show={showDepositModal}
                onClose={() => {
                    setShowDepositModal(false);
                    setSelectedClient(null);
                }}
                onSuccess={() => {
                    fetchData();
                    setShowDepositModal(false);
                }}
                userId={selectedClient?.clientId}
                portfolio={selectedClient}
                isAdmin={!(userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR')}
            />

            <WithdrawalRequestModal
                show={showWithdrawalModal}
                onClose={() => {
                    setShowWithdrawalModal(false);
                    setSelectedClient(null);
                }}
                onSuccess={() => {
                    fetchData();
                    setShowWithdrawalModal(false);
                }}
                portfolio={selectedClient} // Pass the selected client data
                userId={selectedClient?.clientId}
                isAdmin={!(userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR')}
            />

            <PayoutModal
                show={showPayoutModal}
                onClose={() => {
                    setShowPayoutModal(false);
                    setSelectedClient(null);
                }}
                onSuccess={() => {
                    fetchData();
                    setShowPayoutModal(false);
                }}
                userId={selectedClient?.clientId}
                clientName={selectedClient?.clientName}
            />

            <ClientHistoryModal
                show={showHistoryModal}
                onClose={() => {
                    setShowHistoryModal(false);
                    setSelectedClient(null);
                }}
                client={selectedClient}
            />
        </div>
    );
};

export default ClientOverviewDashboard;
