import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { depositService, withdrawalService, adminService } from '../services/api';
import UserIdBadge from '../components/UserIdBadge';
import { Check, X } from 'lucide-react';

const AdminTransactionApprovals = () => {
    // Level 1 Navigation: 'DEPOSIT' or 'WITHDRAWAL'
    const [activeTab, setActiveTab] = useState('DEPOSIT');

    // Level 2 Filters: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
    const [filterStatus, setFilterStatus] = useState('ALL');

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processingId, setProcessingId] = useState(null);
    const [userRole, setUserRole] = useState(null);

    // Modal state for rejection (optional reason)
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            setUserRole(role);
        }
    }, []);

    // Fetch data whenever tab changes
    useEffect(() => {
        fetchRequests();
    }, [activeTab]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            setError('');
            let data = [];
            if (activeTab === 'DEPOSIT') {
                // depositService might take a status param or return all. 
                // Based on previous code: depositService.getAllRequests(status)
                // We'll fetch ALL and filter client-side for "ALL" tab, 
                // but the service might support direct filtering. 
                // Let's fetch all to be safe and consistent with logic below.
                data = await depositService.getAllRequests();
            } else {
                data = await withdrawalService.getAllRequests();
            }
            setRequests(data);
        } catch (error) {
            console.error(`Failed to fetch ${activeTab} requests: `, error);
            setError(`Failed to load ${activeTab.toLowerCase()} requests`);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request) => {
        const action = activeTab === 'DEPOSIT' ? 'approve' : 'approve';
        const type = activeTab === 'DEPOSIT' ? 'deposit' : 'withdrawal';

        if (!window.confirm(`Approve ${type} of ₹${request.amount.toLocaleString()} for ${request.userName || request.user?.name} ? `)) {
            return;
        }

        try {
            setProcessingId(request.id);
            if (activeTab === 'DEPOSIT') {
                await depositService.approveRequest(request.id);
            } else {
                await withdrawalService.approveRequest(request.id);
            }

            // Refund/Refresh
            await fetchRequests();
            // Optional success toast/alert could go here
        } catch (err) {
            console.error(`Error approving ${type}: `, err);
            setError(err.response?.data?.message || `Failed to approve ${type} `);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = (request) => {
        setSelectedRequest(request);
        setShowRejectModal(true);
    };

    const confirmReject = async () => {
        if (!selectedRequest) return;
        const type = activeTab === 'DEPOSIT' ? 'deposit' : 'withdrawal';

        try {
            setProcessingId(selectedRequest.id);
            if (activeTab === 'DEPOSIT') {
                // Check if depositService.rejectRequest supports reason? 
                // AdminDepositRequests.jsx didn't use reason. AdminWithdrawalRequests.jsx did.
                // We will pass it if withdrawal, else just reject.
                await depositService.rejectRequest(selectedRequest.id);
            } else {
                await withdrawalService.rejectRequest(
                    selectedRequest.id,
                    rejectionReason || 'No reason provided'
                );
            }

            await fetchRequests();
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedRequest(null);
        } catch (err) {
            console.error(`Error rejecting ${type}: `, err);
            setError(err.response?.data?.message || `Failed to reject ${type} `);
        } finally {
            setProcessingId(null);
        }
    };

    // Filter logic
    const filteredRequests = requests.filter(req => {
        if (filterStatus === 'ALL') return true;
        return req.status === filterStatus;
    });

    const isReadOnly = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';

    const getStatusBadgeStyle = (status) => {
        const baseStyle = {
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600'
        };
        switch (status) {
            case 'PENDING':
                return { ...baseStyle, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
            case 'APPROVED':
                return { ...baseStyle, background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' };
            case 'REJECTED':
                return { ...baseStyle, background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' };
            default:
                return baseStyle;
        }
    };

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
                    Transaction Approvals
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                    Manage client deposit and withdrawal requests
                </p>
            </div>

            {/* Level 1 Navigation (Tabs) */}
            <div className="admin-tabs" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', marginBottom: '24px' }}>
                {['DEPOSIT', 'WITHDRAWAL'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setFilterStatus('ALL'); }}
                        style={{
                            padding: '12px 0',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                            color: activeTab === tab ? '#6366f1' : '#94a3b8',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginRight: '16px',
                            transition: 'all 0.2s',
                            textTransform: 'capitalize' // Display as "Deposit" / "Withdrawal"
                        }}
                    >
                        {tab === 'DEPOSIT' ? 'Deposits' : 'Withdrawals'}
                    </button>
                ))}
            </div>

            {/* Level 2 Filters */}
            <div className="admin-filters" style={{
                display: 'flex',
                flexWrap: 'nowrap', // Force single line
                gap: '12px',
                marginBottom: '24px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                paddingBottom: '4px',
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
                width: '100%',
                maxWidth: '100vw'
            }}>
                {/* Hide scrollbar for Chrome/Safari/Opera */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .admin-filters::-webkit-scrollbar { display: none; }
                `}} />

                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        style={{
                            flex: '0 0 auto',
                            padding: '8px 16px',
                            background: filterStatus === status ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: filterStatus === status ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '20px',
                            color: filterStatus === status ? '#ffffff' : '#94a3b8',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Table UI */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.6)',
                backdropFilter: 'blur(12px)',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                        <div className="animate-spin" style={{
                            width: '32px', height: '32px', border: '3px solid rgba(99,102,241,0.3)',
                            borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px'
                        }}></div>
                        Loading...
                    </div>
                ) : (
                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', textAlign: 'center' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.4)', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                <th style={{ width: '14%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>User ID</th>
                                <th style={{ width: '14%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Client</th>
                                <th style={{ width: '12%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Amount</th>
                                <th style={{ width: '16%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Note</th>
                                <th style={{ width: '12%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Date</th>
                                <th style={{ width: '12%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                                <th style={{ width: '20%', padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                                        No {filterStatus.toLowerCase()} {activeTab.toLowerCase()} requests found.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(req => (
                                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.05)', transition: 'background 0.2s' }}>
                                        <td data-label="User ID" style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <UserIdBadge userId={req.userId || req.user?.userId || '---'} />
                                        </td>
                                        <td data-label="Client" style={{ padding: '16px 24px', color: '#f1f5f9', fontWeight: '500', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                {req.userName || req.user?.name || 'Unknown'}
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>{req.userEmail || req.user?.email}</div>
                                            </div>
                                        </td>
                                        <td data-label="Amount" style={{ padding: '16px 24px', color: '#f1f5f9', fontWeight: '700', fontFamily: 'monospace', textAlign: 'center' }}>
                                            ₹{req.amount.toLocaleString()}
                                        </td>
                                        <td data-label="Note" style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                {req.note || req.remarks || '-'}
                                            </div>
                                        </td>
                                        <td data-label="Date" style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                {new Date(req.createdAt).toLocaleDateString()}
                                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                    {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Status" style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            <span style={getStatusBadgeStyle(req.status)}>{req.status}</span>
                                        </td>
                                        <td data-label="Actions" style={{ padding: '16px 24px', textAlign: 'center' }}>
                                            {!isReadOnly && req.status === 'PENDING' ? (
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleApprove(req)}
                                                        disabled={processingId === req.id}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: 'rgba(16, 185, 129, 0.1)',
                                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                                            borderRadius: '8px',
                                                            color: '#34d399',
                                                            fontSize: '14px',
                                                            fontWeight: '600',
                                                            cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                                                            opacity: processingId === req.id ? 0.5 : 1,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <Check size={16} strokeWidth={2.5} />
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(req)}
                                                        disabled={processingId === req.id}
                                                        style={{
                                                            padding: '8px 16px',
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            borderRadius: '8px',
                                                            color: '#f87171',
                                                            fontSize: '14px',
                                                            fontWeight: '600',
                                                            cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                                                            opacity: processingId === req.id ? 0.5 : 1,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <X size={16} strokeWidth={2.5} />
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                                    {req.status === 'PENDING' ? 'Read Only' : 'Processed'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && createPortal(
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(5, 7, 10, 0.8)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
                    }}
                    onClick={() => setShowRejectModal(false)}
                >
                    <div
                        style={{
                            background: '#1e293b', borderRadius: '16px', padding: '32px',
                            maxWidth: '500px', width: '90%', border: '1px solid rgba(148, 163, 184, 0.2)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff', marginBottom: '8px' }}>
                            Reject {activeTab === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}
                        </h2>
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '24px' }}>
                            Are you sure you want to reject this request?
                        </p>

                        {activeTab === 'WITHDRAWAL' && (
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                style={{
                                    width: '100%', minHeight: '80px', padding: '12px',
                                    fontSize: '14px', color: '#f8fafc', background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px',
                                    marginBottom: '24px', outline: 'none'
                                }}
                            />
                        )}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowRejectModal(false)}
                                style={{
                                    padding: '10px 20px', background: 'transparent',
                                    border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '8px',
                                    color: '#cbd5e1', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                style={{
                                    padding: '10px 24px', background: '#ef4444',
                                    border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default AdminTransactionApprovals;
