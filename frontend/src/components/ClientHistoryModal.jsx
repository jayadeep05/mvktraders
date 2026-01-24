import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUpRight, ArrowDownLeft, Banknote, Calendar, Check, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api, { depositService, withdrawalService } from '../services/api';

const CustomDropdown = ({ value, onChange, options, icon: Icon, placeholder, minWidth = '120px' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = React.useRef(null);
    const portalRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                (!portalRef.current || !portalRef.current.contains(event.target))
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width
            });
        }
    }, [isOpen]);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', minWidth }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {Icon && <Icon size={14} style={{ color: '#6366f1' }} />}
                    <span>{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                {isOpen ? <ChevronUp size={14} style={{ opacity: 0.6 }} /> : <ChevronDown size={14} style={{ opacity: 0.6 }} />}
            </button>

            {isOpen && createPortal(
                <div ref={portalRef} style={{
                    position: 'fixed',
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                    background: '#1e293b',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 99999,
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    padding: '4px',
                    animation: 'dropdownSlideIn 0.15s ease-out'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '10px 12px',
                                fontSize: '12.5px',
                                color: value === option.value ? '#fff' : '#94a3b8',
                                background: value === option.value ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                fontWeight: value === option.value ? '600' : '400',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.1s ease'
                            }}
                            onMouseEnter={e => {
                                if (value !== option.value) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = '#fff';
                                }
                            }}
                            onMouseLeave={e => {
                                if (value !== option.value) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#94a3b8';
                                }
                            }}
                        >
                            {option.label}
                            {value === option.value && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6366f1' }} />}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

const ClientHistoryModal = ({ show, onClose, client }) => {
    const [userRole, setUserRole] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('COMPLETED');
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            setUserRole(role);
        }
    }, []);

    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') onClose();
        };

        if (show && client) {
            fetchHistory();
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
        } else {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEsc);
        };
    }, [show, client, onClose, userRole]); // Added userRole to dependencies

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const isMediator = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';
            let depositsRes, withdrawalsRes, transactionsRes;

            if (isMediator) {
                // Mediator: Call specific endpoints using String UserID
                const idParam = client.userId; // String ID (e.g., MVK001)

                // If client.userId is undefined, fallback or error. 
                // Note: client object usually has userId (string) and clientId (UUID).

                [depositsRes, withdrawalsRes, transactionsRes] = await Promise.allSettled([
                    api.get(`/mediator/client/${idParam}/deposit-requests`),
                    api.get(`/mediator/client/${idParam}/withdrawal-requests`),
                    api.get(`/mediator/client/${idParam}/transactions`)
                ]);
            } else {
                // Admin: Call admin endpoints
                [depositsRes, withdrawalsRes, transactionsRes] = await Promise.allSettled([
                    api.get('/admin/deposit-requests'),
                    api.get('/admin/withdrawal-requests'),
                    api.get(`/admin/clients/${client.clientId}/transactions`)
                ]);
            }

            let merged = [];

            // Process Deposits
            if (depositsRes.status === 'fulfilled' && depositsRes.value.data) {
                // For Admin, we must filter. For Mediator, it's already filtered.
                const rawDeposits = depositsRes.value.data;
                const userDeposits = isMediator
                    ? rawDeposits
                    : rawDeposits.filter(d => d.userId === client.clientId || (d.user && d.user.id === client.clientId));

                merged = [...merged, ...userDeposits.map(d => ({
                    ...d,
                    type: 'DEPOSIT',
                    date: d.createdAt,
                    status: d.status
                }))];
            }

            // Process Withdrawals
            if (withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value.data) {
                const rawWithdrawals = withdrawalsRes.value.data;
                const userWithdrawals = isMediator
                    ? rawWithdrawals
                    : rawWithdrawals.filter(w =>
                        w.userId === client.clientId ||
                        w.userId === client.userId ||
                        (w.user && w.user.id === client.clientId) ||
                        (w.user && w.user.userId === client.userId)
                    );

                merged = [...merged, ...userWithdrawals.map(w => ({
                    ...w,
                    type: 'WITHDRAWAL',
                    date: w.createdAt,
                    status: w.status
                }))];
            }

            // Process Payouts
            if (transactionsRes.status === 'fulfilled' && transactionsRes.value.data) {
                // Transactions endpoint is always specific to the user (both Admin and Mediator versions)
                const relevantTrans = transactionsRes.value.data.filter(t => t.type === 'PAYOUT');
                merged = [...merged, ...relevantTrans.map(t => ({
                    ...t,
                    type: 'PAYOUT',
                    date: t.date || t.timestamp || t.createdAt,
                    status: 'COMPLETED'
                }))];
            }

            merged.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
            setHistory(merged);

        } catch (error) {
            console.error("Failed to fetch client history", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => {
        const typeMatch = filterType === 'ALL' || item.type === filterType;
        let statusMatch = true;
        if (filterStatus === 'COMPLETED') {
            statusMatch = item.status === 'APPROVED' || item.status === 'COMPLETED';
        } else if (filterStatus === 'PENDING') {
            statusMatch = item.status === 'PENDING';
        }
        return typeMatch && statusMatch;
    });

    const handleApprove = async (item) => {
        // Double check role
        if (userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') return;

        if (!window.confirm(`Approve this ${item.type.toLowerCase()} of ${formatCurrency(item.amount)}?`)) return;
        setProcessingId(item.id);
        try {
            if (item.type === 'DEPOSIT') {
                await depositService.approveRequest(item.id);
            } else if (item.type === 'WITHDRAWAL') {
                await withdrawalService.approveRequest(item.id);
            }
            await fetchHistory();
        } catch (err) {
            console.error("Approve error", err);
            alert(err.response?.data?.message || "Failed to approve");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (item) => {
        if (userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') return;

        let reason = "No reason provided";
        if (item.type === 'WITHDRAWAL') {
            reason = window.prompt("Enter rejection reason:", "Insufficient balance or invalid details");
            if (reason === null) return;
        } else {
            if (!window.confirm("Reject this deposit request?")) return;
        }

        setProcessingId(item.id);
        try {
            if (item.type === 'DEPOSIT') {
                await depositService.rejectRequest(item.id);
            } else if (item.type === 'WITHDRAWAL') {
                await withdrawalService.rejectRequest(item.id, reason);
            }
            await fetchHistory();
        } catch (err) {
            console.error("Reject error", err);
            alert(err.response?.data?.message || "Failed to reject");
        } finally {
            setProcessingId(null);
        }
    };

    if (!show || !client) return null;

    const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString()}`;

    const formatDate = (dateString) => {
        if (!dateString) return { date: '-', time: '-' };
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { date: '-', time: '-' };
        return {
            date: date.toLocaleDateString('en-GB').replace(/\//g, '-'),
            time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED':
            case 'COMPLETED':
                return { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.15)' };
            case 'REJECTED':
                return { bg: 'rgba(244, 63, 94, 0.1)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.15)' };
            default:
                return { bg: 'rgba(251, 191, 36, 0.1)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.15)' };
        }
    };

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(5, 7, 10, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.25s ease'
        }} onClick={onClose}>
            <div style={{
                background: '#131823',
                width: '100%',
                maxWidth: '680px',
                maxHeight: '75vh',
                borderRadius: '24px',
                boxShadow: '0 40px 100px -20px rgba(0, 0, 0, 0.8)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
                animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }} onClick={e => e.stopPropagation()} className="history-modal-inner">

                {/* 🏷️ Header */}
                <div style={{
                    padding: '24px 28px 20px 28px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'rgba(19, 24, 35, 0.5)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                                Transaction History
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{ fontSize: '12px', color: '#6366f1', fontWeight: '700', textTransform: 'uppercase' }}>
                                    {client.clientName}
                                </span>
                                <span style={{ fontSize: '11px', color: '#475569', fontWeight: '500' }}>
                                    #{client.userId}
                                </span>
                            </div>
                        </div>

                        <button onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '50%',
                                transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            className="close-hover-btn"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* 🔍 Filters Bar - Always Visible */}
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '2px' }} className="hide-scrollbar">
                        <CustomDropdown
                            value={filterStatus}
                            onChange={setFilterStatus}
                            icon={AlertCircle}
                            minWidth="135px"
                            options={[
                                { value: 'COMPLETED', label: 'Completed' },
                                { value: 'PENDING', label: 'Pending' },
                                { value: 'ALL', label: 'All Status' }
                            ]}
                        />

                        <CustomDropdown
                            value={filterType}
                            onChange={setFilterType}
                            icon={Calendar}
                            minWidth="145px"
                            options={[
                                { value: 'ALL', label: 'All Types' },
                                { value: 'DEPOSIT', label: 'Funds Added' },
                                { value: 'WITHDRAWAL', label: 'Withdrawals' },
                                { value: 'PAYOUT', label: 'Payouts' }
                            ]}
                        />
                    </div>
                </div>

                {/* 📜 Content List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="custom-scrollbar">
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', color: '#64748b' }}>
                            <div className="neat-spinner"></div>
                            <span style={{ fontSize: '13px', marginTop: '16px', fontWeight: '500' }}>Fetching your records...</span>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '100px 0', color: '#334155' }}>
                            <Calendar size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                            <p style={{ fontSize: '14px', fontWeight: '600' }}>No activities found</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filteredHistory.map((item, idx) => {
                                const statusStyle = getStatusColor(item.status || 'PENDING');
                                const { date, time } = formatDate(item.date || item.createdAt || item.timestamp);
                                const isDeposit = item.type === 'DEPOSIT';
                                const isPayout = item.type === 'PAYOUT';

                                const typeColor = isDeposit ? '#10b981' : isPayout ? '#6366f1' : '#f43f5e';
                                const typeIconBg = isDeposit ? 'rgba(16, 185, 129, 0.1)' : isPayout ? 'rgba(99, 102, 241, 0.1)' : 'rgba(244, 63, 94, 0.1)';

                                return (
                                    <div key={item.id || idx} style={{
                                        background: 'rgba(30, 41, 59, 0.25)',
                                        border: '1px solid rgba(255, 255, 255, 0.03)',
                                        borderRadius: '16px',
                                        padding: '14px 18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px',
                                        transition: 'all 0.2s ease'
                                    }}
                                        className="history-row"
                                    >
                                        <div style={{
                                            width: '40px', height: '40px',
                                            borderRadius: '10px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: typeIconBg,
                                            color: typeColor,
                                            flexShrink: 0
                                        }}>
                                            {isDeposit ? <ArrowUpRight size={20} /> :
                                                isPayout ? <Banknote size={20} /> : <ArrowDownLeft size={20} />}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                                                    {isDeposit ? 'Funds Added' : isPayout ? 'Profit Payout' : item.type === 'PROFIT' ? 'Monthly Profit' : 'Withdrawal'}
                                                </span>
                                                <span style={{
                                                    fontSize: '9px',
                                                    padding: '2px 7px',
                                                    borderRadius: '6px',
                                                    background: statusStyle.bg,
                                                    color: statusStyle.text,
                                                    fontWeight: '800',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.4px',
                                                    border: `1px solid ${statusStyle.border}`
                                                }}>
                                                    {item.status || 'PENDING'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: '500' }}>
                                                {date} • {time}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{
                                                fontSize: '15px',
                                                fontWeight: '800',
                                                color: isDeposit ? '#10b981' : '#f8fafc',
                                                fontFamily: '"JetBrains Mono", monospace',
                                                letterSpacing: '-0.3px'
                                            }}>
                                                {isDeposit ? '+' : '-'} {formatCurrency(item.amount)}
                                            </div>

                                            {item.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleApprove(item)} disabled={!!processingId}
                                                        style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '6px', color: '#10b981', cursor: 'pointer', fontSize: '10px', fontWeight: '800' }}>
                                                        {processingId === item.id ? '...' : 'APPROVE'}
                                                    </button>
                                                    <button onClick={() => handleReject(item)} disabled={!!processingId}
                                                        style={{ width: '24px', height: '24px', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.1)', borderRadius: '6px', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes dropdownSlideIn { 
                    from { opacity: 0; transform: translateY(-8px); } 
                    to { opacity: 1; transform: translateY(0); } 
                }
                
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                
                .history-row:hover {
                    background: rgba(30, 41, 59, 0.4) !important;
                    border-color: rgba(99, 102, 241, 0.15) !important;
                }

                .close-hover-btn:hover { background: rgba(255, 255, 255, 0.08) !important; color: #fff !important; }

                .neat-spinner {
                    width: 24px; height: 24px;
                    border: 2px solid rgba(99, 102, 241, 0.1);
                    border-top-color: #6366f1;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

                @media (max-width: 640px) {
                    .history-modal-inner {
                        max-height: 85vh !important;
                        margin: 0 8px !important;
                        border-radius: 20px !important;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ClientHistoryModal;
