import React, { useState, useEffect } from 'react';
import { mediatorService } from '../services/api';

const MediatorDashboard = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        mobile: '',
        role: 'CLIENT'
    });
    const [filterStatus, setFilterStatus] = useState('ALL');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [users, portfolios] = await Promise.all([
                mediatorService.getClients(),
                mediatorService.getPortfolios()
            ]);

            // Merge user and portfolio data
            const merged = users.map(user => {
                const portfolio = portfolios.find(p => p.clientId?.toString() === user.id?.toString());
                return {
                    ...user,
                    totalValue: portfolio ? portfolio.currentValue : 0,
                    profit: portfolio ? portfolio.profitOrLoss : 0,
                    invested: portfolio ? portfolio.totalInvested : 0,
                    hasPortfolio: !!portfolio
                };
            });

            setClients(merged);
        } catch (e) {
            console.error("Failed to fetch data", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await mediatorService.createClientRequest(formData);
            alert('User creation request submitted successfully. Pending Admin approval.');
            setShowModal(false);
            setFormData({ name: '', email: '', password: '', mobile: '', role: 'CLIENT' });
            fetchData();
        } catch (e) {
            console.error("Client creation failed", e);
            const message = e.response?.data?.message || 'Failed to submit request';
            alert(`Error: ${message}`);
        }
    };

    const handleImpersonate = async (clientId) => {
        if (window.confirm("Active session will be replaced. Login as this client?")) {
            try {
                const response = await mediatorService.impersonateClient(clientId);
                if (response.access_token) {
                    localStorage.setItem('token', response.access_token);
                    localStorage.setItem('refresh_token', response.refresh_token);
                    // Force reload to update app state with new user role
                    window.location.href = '/dashboard';
                }
            } catch (e) {
                console.error("Impersonation failed", e);
                alert("Failed to login as client: " + (e.response?.data?.message || e.message));
            }
        }
    };

    const handleDeleteRequest = async (client) => {
        const reason = window.prompt(`Enter reason for deleting client ${client.name}:`);
        if (!reason) return;

        if (window.confirm(`Are you sure you want to request deletion for ${client.name}?`)) {
            try {
                await mediatorService.requestClientDeletion(client.id, reason);
                alert('Deletion request submitted successfully.');
            } catch (e) {
                console.error("Deletion request failed", e);
                alert('Failed to submit deletion request: ' + (e.response?.data?.message || e.message));
            }
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
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
                        Mediator Workspace
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                        Manage clients, view portfolios, and initiate requests
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transition: 'transform 0.2s',
                        fontSize: '14px'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    + Request New User
                </button>
            </div>

            <div className="glass-panel" style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                padding: '24px',
                overflow: 'hidden'
            }}>
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>Client Portfolios</h2>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Total Clients: {clients.length}</span>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {['ALL', 'ACTIVE', 'PENDING_APPROVAL', 'REJECTED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: filterStatus === status ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                background: filterStatus === status ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                                color: filterStatus === status ? '#818cf8' : '#94a3b8',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {status === 'PENDING_APPROVAL' ? 'Pending' : status}
                        </button>
                    ))}
                </div>


                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <th style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>User ID</th>
                            <th style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Client</th>
                            <th style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Email</th>
                            <th style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Role</th>
                            <th style={{ padding: '16px', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Total Value</th>
                            <th style={{ padding: '16px', textAlign: 'right', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Profit/Loss</th>
                            <th style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Loading...</td></tr>
                        ) : clients.length === 0 ? (
                            <tr><td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No clients found.</td></tr>
                        ) : (
                            clients.filter(c => filterStatus === 'ALL' || c.status === filterStatus).map(client => (
                                <tr key={client.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                            {client.userId ? (
                                                <span style={{
                                                    padding: '4px 8px',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                    borderRadius: '6px',
                                                    color: '#818cf8',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    fontFamily: 'monospace'
                                                }}>{client.userId}</span>
                                            ) : '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#f8fafc' }}>
                                        <div style={{ fontWeight: '500' }}>{client.name}</div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#cbd5e1' }}>{client.email}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            fontSize: '12px',
                                            background: 'rgba(56, 189, 248, 0.1)',
                                            color: '#38bdf8'
                                        }}>
                                            {client.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            fontSize: '12px',
                                            background: client.status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.1)' :
                                                client.status === 'PENDING_APPROVAL' ? 'rgba(234, 179, 8, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: client.status === 'ACTIVE' ? '#4ade80' :
                                                client.status === 'PENDING_APPROVAL' ? '#facc15' : '#f87171'
                                        }}>
                                            {client.status?.replace('_', ' ') || 'UNKNOWN'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px', color: '#fff' }}>
                                        {client.hasPortfolio ? `$${client.totalValue.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '14px' }}>
                                        {client.hasPortfolio ? (
                                            <span style={{ color: client.profit >= 0 ? '#4ade80' : '#f87171' }}>
                                                {client.profit >= 0 ? '+' : ''}${client.profit.toLocaleString()}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => handleImpersonate(client.id)}
                                                title="Login as Client"
                                                style={{
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    color: '#818cf8',
                                                    border: '1px solid rgba(99, 102, 241, 0.2)',
                                                    padding: '6px 12px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: '600'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                                    <polyline points="10 17 15 12 10 7"></polyline>
                                                    <line x1="15" y1="12" x2="3" y2="12"></line>
                                                </svg>
                                                Login
                                            </button>

                                            <button
                                                onClick={() => handleDeleteRequest(client)}
                                                title="Request Delete"
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M3 6h18"></path>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create User Modal */}
            {
                showModal && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}>
                        <div style={{
                            background: '#1e293b',
                            padding: '32px',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '500px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>Request New Client</h2>
                            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Fill in the details to request a new client account. Admin approval required.</p>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontSize: '14px' }}>Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'rgba(15, 23, 42, 0.5)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontSize: '14px' }}>Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'rgba(15, 23, 42, 0.5)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontSize: '14px' }}>Mobile Number</label>
                                    <input
                                        type="tel"
                                        name="mobile"
                                        value={formData.mobile}
                                        onChange={handleInputChange}
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'rgba(15, 23, 42, 0.5)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '6px', fontSize: '14px' }}>Password</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            background: 'rgba(15, 23, 42, 0.5)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: 'white',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                    <button type="button" onClick={() => setShowModal(false)} style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: 'transparent',
                                        border: '1px solid rgba(148, 163, 184, 0.2)',
                                        color: '#cbd5e1',
                                        borderRadius: '8px',
                                        cursor: 'pointer'
                                    }}>Cancel</button>
                                    <button type="submit" style={{
                                        flex: 1,
                                        padding: '10px',
                                        background: '#6366f1',
                                        border: 'none',
                                        color: 'white',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600'
                                    }}>Submit Request</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default MediatorDashboard;
