import React, { useEffect, useState } from 'react';
import { depositService } from '../services/api';
import DepositRequestModal from './DepositRequestModal';
import UserIdBadge from './UserIdBadge';

const AdminDepositRequests = ({ readOnly }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const status = filterStatus === 'ALL' ? null : filterStatus;
            const data = await depositService.getAllRequests(status);
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch deposit requests", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this deposit? This will increase the client's balance.")) return;
        try {
            await depositService.approveRequest(id);
            fetchRequests();
        } catch (error) {
            alert("Failed to approve: " + (error.response?.data?.message || "Error"));
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("Are you sure you want to reject this deposit?")) return;
        try {
            await depositService.rejectRequest(id);
            fetchRequests();
        } catch (error) {
            alert("Failed to reject: " + (error.response?.data?.message || "Error"));
        }
    };

    const filteredRequests = filterStatus === 'ALL'
        ? requests
        : requests.filter(r => r.status === filterStatus);

    return (
        <div className="animate-fade-in" style={{ padding: '0 0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: 'white' }}>Deposit Management</h2>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                background: filterStatus === status ? '#6366f1' : 'transparent',
                                color: filterStatus === status ? 'white' : '#94a3b8',
                                cursor: 'pointer'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                    {!readOnly && (
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                background: '#10b981',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                marginLeft: '1rem'
                            }}
                        >
                            + Create Request
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94a3b8' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>User ID</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Client</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Note</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                            {!readOnly && <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.length === 0 ? (
                            <tr><td colSpan={readOnly ? 6 : 7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No requests found.</td></tr>
                        ) : (
                            filteredRequests.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                                    <td data-label="User ID" style={{ padding: '1rem', textAlign: 'center' }}>
                                        <UserIdBadge userId={r.user?.userId || '-'} />
                                    </td>
                                    <td data-label="Client" style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div className="responsive-align">
                                            <div style={{ fontWeight: '500', color: '#f1f5f9' }}>{r.user?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.user?.email}</div>
                                        </div>
                                    </td>
                                    <td data-label="Amount" style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: '#f1f5f9' }}>₹{r.amount.toLocaleString()}</td>
                                    <td data-label="Note" style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.note || '-'}</td>
                                    <td data-label="Date" style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
                                        <div className="responsive-align">
                                            {new Date(r.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td data-label="Status" style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            background: r.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.2)' : r.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: r.status === 'APPROVED' ? '#34d399' : r.status === 'REJECTED' ? '#f87171' : '#fbbf24'
                                        }}>
                                            {r.status}
                                        </span>
                                    </td>
                                    {!readOnly && (
                                        <td data-label="Actions" style={{ padding: '1rem', textAlign: 'center' }}>
                                            {r.status === 'PENDING' && (
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleApprove(r.id)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            background: 'rgba(16, 185, 129, 0.2)',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                                            color: '#34d399',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(r.id)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            color: '#f87171',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}
                                            {r.status !== 'PENDING' && (
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Processed</div>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <DepositRequestModal
                show={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={() => {
                    fetchRequests();
                    setShowModal(false);
                }}
            />
        </div>
    );
};

export default AdminDepositRequests;
