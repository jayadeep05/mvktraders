import React, { useState, useEffect } from 'react';
import { adminService, mediatorService } from '../services/api';
import UserIdBadge from '../components/UserIdBadge';

const AdminPendingUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            setUserRole(role);
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
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
            setUsers(data);
        } catch (e) {
            console.error("Failed to fetch pending users", e);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (window.confirm('Are you sure you want to approve this user?')) {
            try {
                await adminService.approveUser(id);
                alert('User approved successfully');
                fetchUsers();
            } catch (e) {
                console.error(e);
                alert('Error approving user');
            }
        }
    };

    const handleReject = async (id) => {
        if (window.confirm('Are you sure you want to reject this user? This will remove the request.')) {
            try {
                await adminService.rejectUser(id);
                alert('User request rejected');
                fetchUsers();
            } catch (e) {
                console.error(e);
                alert('Error rejecting user');
            }
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
                    Pending User Approvals
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                    Review {isReadOnly ? '' : 'and approve'} user creation requests initiated by Mediators
                </p>
            </div>

            <div className="glass-panel" style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                overflow: 'hidden'
            }}>
                <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ background: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                            <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>User ID</th>
                            <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
                            <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                            <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Mobile</th>
                            <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Role</th>
                            {!isReadOnly && (
                                <th style={{ width: '25%', padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={isReadOnly ? "5" : "6"} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={isReadOnly ? "5" : "6"} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No pending approvals found.</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.05)' }}>
                                    <td data-label="User ID" style={{ padding: '16px', textAlign: 'center' }}>
                                        <UserIdBadge userId={user.userId} />
                                    </td>
                                    <td data-label="Name" style={{ padding: '16px', color: '#f8fafc', textAlign: 'center' }}>{user.name}</td>
                                    <td data-label="Email" style={{ padding: '16px', color: '#cbd5e1', textAlign: 'center' }}>{user.email}</td>
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
                                        <td data-label="Actions" style={{ padding: '16px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => handleApprove(user.id)}
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
                                                    onClick={() => handleReject(user.id)}
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
            </div>
        </div>
    );
};

export default AdminPendingUsers;
