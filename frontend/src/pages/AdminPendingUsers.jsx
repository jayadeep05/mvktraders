import React, { useState, useEffect } from 'react';
import { adminService, mediatorService } from '../services/api';
import UserIdBadge from '../components/UserIdBadge';

const AdminPendingUsers = () => {
    const [activeTab, setActiveTab] = useState('REGISTRATIONS');
    const [registrations, setRegistrations] = useState([]);
    const [deleteRequests, setDeleteRequests] = useState([]);
    const [loading, setLoading] = useState(true);
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
        if (activeTab === 'REGISTRATIONS') {
            console.log("Switching to registrations tab");
            fetchRegistrations();
        } else {
            console.log("Switching to delete requests tab");
            fetchDeleteRequests();
        }
    }, [activeTab]);

    const fetchRegistrations = async () => {
        try {
            setLoading(true);
            let data;
            const token = localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);

            if (role === 'ROLE_MEDIATOR' || role === 'MEDIATOR') {
                data = await mediatorService.getPendingUsers();
            } else {
                data = await adminService.getPendingUsers();
            }
            setRegistrations(data);
        } catch (e) {
            console.error("Failed to fetch pending users", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeleteRequests = async () => {
        try {
            setLoading(true);
            let data;
            const token = localStorage.getItem('token');
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);

            if (role === 'ROLE_MEDIATOR' || role === 'MEDIATOR') {
                // Mediator can see their own requests? The API exists: mediatorService.getDeleteRequests
                data = await mediatorService.getDeleteRequests();
            } else {
                data = await adminService.getDeleteRequests();
            }
            setDeleteRequests(data);
        } catch (e) {
            console.error("Failed to fetch delete requests", e);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveRegistration = async (id) => {
        if (window.confirm('Are you sure you want to approve this user?')) {
            try {
                await adminService.approveUser(id);
                alert('User approved successfully');
                fetchRegistrations();
            } catch (e) {
                console.error(e);
                alert('Error approving user');
            }
        }
    };

    const handleRejectRegistration = async (id) => {
        if (window.confirm('Are you sure you want to reject this user? This will remove the request.')) {
            try {
                await adminService.rejectUser(id);
                alert('User request rejected');
                fetchRegistrations();
            } catch (e) {
                console.error(e);
                alert('Error rejecting user');
            }
        }
    };

    const handleApproveDelete = async (requestId) => {
        const password = window.prompt("To confirm deletion, please enter your admin password:");
        if (!password) return;

        try {
            await adminService.approveDeleteRequest(requestId, password);
            alert('Deletion request approved and user deleted.');
            fetchDeleteRequests();
        } catch (e) {
            console.error(e);
            alert('Error approving deletion: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleRejectDelete = async (requestId) => {
        if (!window.confirm("Reject this deletion request?")) return;

        try {
            await adminService.rejectDeleteRequest(requestId);
            alert('Deletion request rejected.');
            fetchDeleteRequests();
        } catch (e) {
            console.error(e);
            alert('Error rejecting deletion: ' + (e.response?.data?.message || e.message));
        }
    };

    const isReadOnly = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }} className="animate-fade-in">
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
                    User Approvals
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                    Manage user registration and deletion requests
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                <button
                    onClick={() => setActiveTab('REGISTRATIONS')}
                    style={{
                        padding: '12px 4px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'REGISTRATIONS' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'REGISTRATIONS' ? '#fff' : '#94a3b8',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    New Registrations
                </button>
                <button
                    onClick={() => setActiveTab('DELETE_REQUESTS')}
                    style={{
                        padding: '12px 4px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'DELETE_REQUESTS' ? '2px solid #6366f1' : '2px solid transparent',
                        color: activeTab === 'DELETE_REQUESTS' ? '#fff' : '#94a3b8',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Deletion Requests
                </button>
            </div>

            <div className="glass-panel" style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                overflow: 'hidden'
            }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading...</div>
                ) : activeTab === 'REGISTRATIONS' ? (
                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>User ID</th>
                                <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
                                <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Mobile</th>
                                <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Role</th>
                                {!isReadOnly && (
                                    <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Mediator</th>
                                )}
                                {!isReadOnly && (
                                    <th style={{ width: '25%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {registrations.length === 0 ? (
                                <tr><td colSpan={isReadOnly ? "5" : "7"} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No pending approvals found.</td></tr>
                            ) : (
                                registrations.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.05)' }}>
                                        <td data-label="User ID" style={{ padding: '16px', textAlign: 'center' }}>
                                            <UserIdBadge userId={user.userId} />
                                        </td>
                                        <td data-label="Name" style={{ padding: '16px', color: '#f8fafc', textAlign: 'center' }}>{user.name}</td>
                                        <td data-label="Mobile" style={{ padding: '16px', color: '#cbd5e1', textAlign: 'center' }}>{user.mobile || '-'}</td>
                                        <td data-label="Role" style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                color: '#38bdf8',
                                                padding: '4px 8px',
                                                borderRadius: '999px',
                                                fontSize: '12px'
                                            }}>
                                                {user.role}
                                            </span>
                                        </td>
                                        {!isReadOnly && (
                                            <td data-label="Mediator" style={{ padding: '16px', color: '#cbd5e1', textAlign: 'center' }}>
                                                {user.mediatorName || 'Direct'}
                                            </td>
                                        )}
                                        {!isReadOnly && (
                                            <td data-label="Actions" style={{ padding: '16px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleApproveRegistration(user.id)}
                                                        style={{
                                                            background: 'rgba(34, 197, 94, 0.2)',
                                                            color: '#4ade80',
                                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRegistration(user.id)}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            color: '#f87171',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                <th style={{ width: '20%', padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Target User</th>
                                <th style={{ width: '15%', padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Mediator</th>
                                <th style={{ width: '25%', padding: '16px', textAlign: 'left', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Reason</th>
                                <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                                {!isReadOnly && (
                                    <th style={{ width: '25%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {deleteRequests.length === 0 ? (
                                <tr><td colSpan={isReadOnly ? "4" : "5"} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No deletion requests found.</td></tr>
                            ) : (
                                deleteRequests.map(req => (
                                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.05)' }}>
                                        <td data-label="Target User" style={{ padding: '16px', textAlign: 'left' }}>
                                            <div style={{ color: '#f8fafc', fontWeight: '500' }}>{req.targetUser?.name || 'Unknown'}</div>
                                        </td>
                                        <td data-label="Mediator" style={{ padding: '16px', color: '#cbd5e1', textAlign: 'left' }}>
                                            {req.requester?.name || 'Unknown'}
                                        </td>
                                        <td data-label="Reason" style={{ padding: '16px', color: '#cbd5e1', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                                            {req.reason}
                                        </td>
                                        <td data-label="Status" style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{
                                                background: req.status === 'PENDING' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                                color: req.status === 'PENDING' ? '#fbbf24' : '#94a3b8',
                                                padding: '4px 8px',
                                                borderRadius: '999px',
                                                fontSize: '12px',
                                                fontWeight: '600'
                                            }}>
                                                {req.status}
                                            </span>
                                        </td>
                                        {!isReadOnly && req.status === 'PENDING' && (
                                            <td data-label="Actions" style={{ padding: '16px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleApproveDelete(req.id)}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.2)',
                                                            color: '#f87171',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Confirm Delete
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectDelete(req.id)}
                                                        style={{
                                                            background: 'rgba(148, 163, 184, 0.1)',
                                                            color: '#94a3b8',
                                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: '600'
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {!isReadOnly && req.status !== 'PENDING' && (
                                            <td data-label="Actions" style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                                                -
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default AdminPendingUsers;
