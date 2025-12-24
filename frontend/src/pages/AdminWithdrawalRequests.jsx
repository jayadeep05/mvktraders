import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, withdrawalService } from '../services/api';
import UserIdBadge from '../components/UserIdBadge';

const AdminWithdrawalRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('ALL');
    const [processingId, setProcessingId] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            setUserRole(role);
        }
        fetchWithdrawalRequests();
    }, []);

    const fetchWithdrawalRequests = async () => {
        try {
            setLoading(true);
            const data = await withdrawalService.getAllRequests();
            setRequests(data);
        } catch (error) {
            console.error('Failed to fetch withdrawal requests:', error);
            setError('Failed to load withdrawal requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request) => {
        if (!window.confirm(`Approve withdrawal of ₹${request.amount.toLocaleString()} for ${request.userName}?`)) {
            return;
        }

        try {
            setProcessingId(request.id);
            const response = await withdrawalService.approveRequest(request.id);

            if (response.success) {
                await fetchWithdrawalRequests();
                alert('Withdrawal request approved successfully!');
            } else {
                setError(response.message || 'Failed to approve request');
            }
        } catch (err) {
            console.error('Error approving request:', err);
            setError(err.response?.data?.message || 'Failed to approve request');
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

        try {
            setProcessingId(selectedRequest.id);
            const response = await withdrawalService.rejectRequest(
                selectedRequest.id,
                rejectionReason || 'No reason provided'
            );

            if (response.success) {
                await fetchWithdrawalRequests();
                setShowRejectModal(false);
                setRejectionReason('');
                setSelectedRequest(null);
                alert('Withdrawal request rejected');
            } else {
                setError(response.message || 'Failed to reject request');
            }
        } catch (err) {
            console.error('Error rejecting request:', err);
            setError(err.response?.data?.message || 'Failed to reject request');
        } finally {
            setProcessingId(null);
        }
    };

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
                return {
                    ...baseStyle,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                };
            case 'APPROVED':
                return {
                    ...baseStyle,
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                };
            case 'REJECTED':
                return {
                    ...baseStyle,
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                };
            default:
                return baseStyle;
        }
    };

    const filteredRequests = requests.filter(req => {
        if (filter === 'ALL') return true;
        return req.status === filter;
    });

    const isReadOnly = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';

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
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading withdrawal requests...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }} className="animate-fade-in">
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '32px',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '8px',
                        letterSpacing: '-0.5px'
                    }}>
                        Withdrawal Requests
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                        Review {isReadOnly ? '' : 'and process'} client withdrawal requests
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/clients')}
                    style={{
                        padding: '12px 24px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        borderRadius: '12px',
                        color: '#cbd5e1',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.target.style.background = 'rgba(30, 41, 59, 1)';
                        e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.target.style.background = 'rgba(30, 41, 59, 0.8)';
                        e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                    }}
                >
                    ← Back to Clients
                </button>
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                paddingBottom: '0'
            }}>
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        style={{
                            padding: '12px 24px',
                            background: filter === status ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                            border: 'none',
                            borderBottom: filter === status ? '2px solid #6366f1' : '2px solid transparent',
                            color: filter === status ? '#ffffff' : '#94a3b8',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (filter !== status) {
                                e.target.style.color = '#cbd5e1';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (filter !== status) {
                                e.target.style.color = '#94a3b8';
                            }
                        }}
                    >
                        {status}
                        {status === 'ALL' && ` (${requests.length})`}
                        {status !== 'ALL' && ` (${requests.filter(r => r.status === status).length})`}
                    </button>
                ))}
            </div>

            {/* Error Alert */}
            {error && (
                <div className="animate-fade-in" style={{
                    padding: '16px 20px',
                    marginBottom: '24px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    color: '#fca5a5',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        style={{
                            marginLeft: 'auto',
                            background: 'none',
                            border: 'none',
                            color: '#fca5a5',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}
                    >✕</button>
                </div>
            )}

            {/* Requests Table */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{
                                background: 'rgba(15, 23, 42, 0.5)',
                                borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                            }}>
                                <th style={{
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>User ID</th>
                                <th style={{
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Client</th>
                                <th style={{
                                    padding: '16px 20px',
                                    textAlign: 'right',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Amount</th>
                                <th style={{
                                    padding: '16px 20px',
                                    textAlign: 'left',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Request Date</th>
                                <th style={{
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Status</th>
                                {!isReadOnly && (
                                    <th style={{
                                        padding: '16px 20px',
                                        textAlign: 'center',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#94a3b8',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={isReadOnly ? "5" : "6"} style={{
                                        padding: '64px 20px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>💰</div>
                                        <p style={{ color: '#64748b', fontSize: '15px' }}>
                                            No {filter.toLowerCase()} withdrawal requests found
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request) => (
                                    <tr
                                        key={request.id}
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
                                            <UserIdBadge userId={request.userId} />
                                        </td>
                                        <td data-label="Client" style={{ padding: '20px', textAlign: 'center' }}>
                                            <div className="responsive-align">
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: '500',
                                                    color: '#f8fafc',
                                                    marginBottom: '2px'
                                                }}>{request.userName}</div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#64748b'
                                                }}>{request.userEmail}</div>
                                            </div>
                                        </td>
                                        <td data-label="Amount" style={{
                                            padding: '20px',
                                            textAlign: 'right',
                                            fontSize: '16px',
                                            fontFamily: 'monospace',
                                            fontWeight: '600',
                                            color: '#cbd5e1'
                                        }}>
                                            ₹{request.amount.toLocaleString()}
                                        </td>
                                        <td data-label="Request Date" style={{
                                            padding: '20px',
                                            fontSize: '14px',
                                            color: '#94a3b8',
                                            textAlign: 'center'
                                        }}>
                                            <div className="responsive-align">
                                                {new Date(request.createdAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td data-label="Status" style={{ padding: '20px', textAlign: 'center' }}>
                                            <span style={getStatusBadgeStyle(request.status)}>
                                                {request.status}
                                            </span>
                                        </td>
                                        {!isReadOnly && (
                                            <td data-label="Actions" style={{ padding: '20px', textAlign: 'center' }}>
                                                {request.status === 'PENDING' ? (
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleApprove(request)}
                                                            disabled={processingId === request.id}
                                                            style={{
                                                                padding: '8px 16px',
                                                                background: processingId === request.id ? '#4f46e5' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                color: '#ffffff',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                                                                opacity: processingId === request.id ? 0.7 : 1,
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (processingId !== request.id) {
                                                                    e.target.style.transform = 'translateY(-2px)';
                                                                    e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.transform = 'translateY(0)';
                                                                e.target.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(request)}
                                                            disabled={processingId === request.id}
                                                            style={{
                                                                padding: '8px 16px',
                                                                background: 'rgba(239, 68, 68, 0.1)',
                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                borderRadius: '8px',
                                                                color: '#fca5a5',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: processingId === request.id ? 'not-allowed' : 'pointer',
                                                                opacity: processingId === request.id ? 0.7 : 1,
                                                                transition: 'all 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (processingId !== request.id) {
                                                                    e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                                                            }}
                                                        >
                                                            ✕ Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                                                        {request.processedAt && new Date(request.processedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    className="animate-fade-in"
                    onClick={() => setShowRejectModal(false)}
                >
                    <div
                        className="animate-scale-in"
                        style={{
                            background: 'rgba(30, 41, 59, 1)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '500px',
                            width: '90%',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#ffffff',
                            marginBottom: '8px'
                        }}>Reject Withdrawal Request</h2>
                        <p style={{
                            fontSize: '14px',
                            color: '#94a3b8',
                            marginBottom: '24px'
                        }}>
                            Provide a reason for rejecting this withdrawal request (optional)
                        </p>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            style={{
                                width: '100%',
                                minHeight: '100px',
                                padding: '12px',
                                fontSize: '14px',
                                color: '#f8fafc',
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '8px',
                                outline: 'none',
                                resize: 'vertical',
                                fontFamily: 'inherit',
                                marginBottom: '24px'
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

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    borderRadius: '8px',
                                    color: '#cbd5e1',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmReject}
                                disabled={processingId}
                                style={{
                                    padding: '10px 24px',
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#ffffff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: processingId ? 'not-allowed' : 'pointer',
                                    opacity: processingId ? 0.7 : 1
                                }}
                            >
                                {processingId ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWithdrawalRequests;
