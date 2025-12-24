import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, X, Pencil, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminService, mediatorService } from '../services/api';
import UserIdBadge from '../components/UserIdBadge';

const CreateUser = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [userRole, setUserRole] = useState(null);
    const [activeTab, setActiveTab] = useState('CLIENTS');
    const [creationMode, setCreationMode] = useState('CLIENT');
    const [successModal, setSuccessModal] = useState({ show: false, userId: '', message: '' });
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            setUserRole(role);
        }
    }, []);
    const [showPasswords, setShowPasswords] = useState({});

    // Close on ESC (Form)
    useEffect(() => {
        if (!showForm) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') setShowForm(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showForm]);

    // Close on ESC (Success Modal)
    useEffect(() => {
        if (!successModal.show) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') setSuccessModal(prev => ({ ...prev, show: false }));
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [successModal.show]);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        city: '',
        investmentAmount: '',
        percentageOffered: '',
        password: '',
        status: 'ACTIVE' // Default status
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        fetchUsers();
    }, [activeTab]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            if (activeTab === 'CLIENTS') {
                // Use getAllClientsSummary to get complete data including investment and userId
                const data = await adminService.getAllClientsSummary();
                const mappedUsers = data.map(u => ({
                    id: u.clientId,
                    userId: u.userId,
                    name: u.clientName,
                    email: u.email,
                    mobile: u.mobile,
                    totalInvested: u.totalInvested,
                    percentageOffered: u.profitPercentage,
                    status: u.status,
                    type: 'CLIENT'
                }));
                setUsers(mappedUsers);
            } else {
                const data = await adminService.getAllUsers();
                const mediators = data.filter(u => u.role === 'MEDIATOR');
                const mappedUsers = mediators.map(u => ({
                    id: u.id,
                    userId: u.userId,
                    name: u.name,
                    email: u.email,
                    mobile: u.mobile,
                    status: u.status,
                    createdAt: u.createdAt,
                    type: 'MEDIATOR'
                }));
                setUsers(mappedUsers);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = (userId) => {
        setShowPasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.fullName.trim()) newErrors.fullName = 'Required';
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Required';
        } else if (!/^\d{10}$/.test(formData.phoneNumber.replace(/[-\s]/g, ''))) {
            newErrors.phoneNumber = 'Invalid format';
        }
        if (creationMode === 'CLIENT' && !editingUser) {
            if (!formData.city.trim()) newErrors.city = 'Required';
            if (!formData.investmentAmount) {
                newErrors.investmentAmount = 'Required';
            } else if (parseFloat(formData.investmentAmount) <= 0) {
                newErrors.investmentAmount = '> 0';
            }
            if (!formData.percentageOffered) {
                newErrors.percentageOffered = 'Required';
            } else if (parseFloat(formData.percentageOffered) < 0 || parseFloat(formData.percentageOffered) > 100) {
                newErrors.percentageOffered = '0-100';
            }
        } else if (creationMode !== 'CLIENT') {
            // Mediator validation
            if (!formData.email.trim()) newErrors.email = 'Required';
            else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
        }

        // Password validation (Optional - defaults used if empty)
        // if (!formData.password && !editingUser) newErrors.password = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleImpersonate = async (user) => {
        if (!window.confirm(`Login as ${user.name}? You will be logged out of Admin.`)) return;
        try {
            const response = await adminService.impersonateUser(user.id);
            localStorage.setItem('token', response.access_token);
            if (response.refresh_token) localStorage.setItem('refresh_token', response.refresh_token);
            window.location.href = '/dashboard';
        } catch (error) {
            console.error(error);
            alert('Failed to impersonate user');
        }
    };

    const handleCreate = (mode) => {
        setEditingUser(null);
        setCreationMode(mode);
        setFormData({
            fullName: '',
            phoneNumber: '',
            email: '',
            city: '',
            investmentAmount: '',
            percentageOffered: '',
            password: '',
            status: 'ACTIVE'
        });
        setShowForm(true);
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setCreationMode(activeTab === 'CLIENTS' ? 'CLIENT' : 'MEDIATOR');
        setFormData({
            fullName: user.name || '',
            phoneNumber: user.mobile || '',
            email: user.email || '',
            userId: user.userId || '',
            city: '',
            investmentAmount: user.totalInvested || '',
            percentageOffered: user.percentageOffered || '',
            password: '',
            status: user.status || 'ACTIVE'
        });
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) return;

        setSubmitting(true);

        try {
            const isMediator = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';
            let response;

            if (isMediator) {
                response = await mediatorService.createClientRequest({
                    fullName: formData.fullName,
                    phoneNumber: formData.phoneNumber,
                    city: formData.city,
                    investmentAmount: parseFloat(formData.investmentAmount),
                    percentageOffered: parseFloat(formData.percentageOffered),
                });
                if (response.success) alert("Client creation request submitted for approval.");
            } else {
                if (editingUser) {
                    const payload = {
                        name: formData.fullName,
                        mobile: formData.phoneNumber,
                        email: formData.email,
                        password: formData.password,
                        status: formData.status
                    };
                    response = await adminService.updateUser(editingUser.id, payload);
                } else if (creationMode === 'CLIENT') {
                    response = await adminService.createClient({
                        fullName: formData.fullName,
                        phoneNumber: formData.phoneNumber,
                        city: formData.city,
                        investmentAmount: parseFloat(formData.investmentAmount),
                        percentageOffered: parseFloat(formData.percentageOffered),
                        password: formData.password
                    });
                } else {
                    response = await adminService.createMediator({
                        name: formData.fullName,
                        email: formData.email,
                        mobile: formData.phoneNumber,
                        password: formData.password,
                        role: 'MEDIATOR'
                    });
                }
            }

            if (response.success) {
                if (editingUser) {
                    alert('User updated successfully');
                } else {
                    // Show success modal for both CLIENT and MEDIATOR creation
                    setSuccessModal({
                        show: true,
                        userId: response.userId,
                        message: `${creationMode === 'CLIENT' ? 'Client' : 'Mediator'} created successfully`
                    });
                }

                setShowForm(false);
                fetchUsers();
                setFormData({
                    fullName: '',
                    phoneNumber: '',
                    email: '',
                    city: '',
                    investmentAmount: '',
                    percentageOffered: '',
                    password: '',
                    status: 'ACTIVE'
                });
                setEditingUser(null);
            } else {
                setError(response.message || 'Failed to create user');
            }
        } catch (err) {
            console.error('Error creating client:', err);
            setError(err.response?.data?.message || 'Failed to create client. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const search = searchTerm.toLowerCase();
        return (
            (user.name?.toLowerCase() || '').includes(search) ||
            (user.email?.toLowerCase() || '').includes(search) ||
            (user.mobile?.toLowerCase() || '').includes(search) ||
            (user.userId?.toLowerCase() || '').includes(search)
        );
    });

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
                <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading users...</p>
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
                        User Management
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                        Manage client profiles and access credentials
                    </p>
                </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                <button
                    onClick={() => setActiveTab('CLIENTS')}
                    style={{
                        padding: '10px 24px',
                        background: activeTab === 'CLIENTS' ? '#6366f1' : 'transparent',
                        borderRadius: '20px',
                        border: activeTab === 'CLIENTS' ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                        color: activeTab === 'CLIENTS' ? '#ffffff' : '#94a3b8',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    Clients
                </button>
                {!(userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') && (
                    <button
                        onClick={() => setActiveTab('MEDIATORS')}
                        style={{
                            padding: '10px 24px',
                            background: activeTab === 'MEDIATORS' ? '#6366f1' : 'transparent',
                            borderRadius: '20px',
                            border: activeTab === 'MEDIATORS' ? 'none' : '1px solid rgba(148, 163, 184, 0.2)',
                            color: activeTab === 'MEDIATORS' ? '#ffffff' : '#94a3b8',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    >
                        Mediators
                    </button>
                )}
            </div>

            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                flexWrap: 'wrap'
            }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
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
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                {/* Create Mediator Button */}
                {/* Create Mediator Button */}
                {activeTab === 'MEDIATORS' && !(userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') && (
                    <button
                        onClick={() => handleCreate('MEDIATOR')}
                        style={{
                            padding: '14px 28px',
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '12px',
                            color: '#e2e8f0',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(30, 41, 59, 1)'}
                        onMouseLeave={(e) => e.target.style.background = 'rgba(30, 41, 59, 0.8)'}
                    >
                        <span style={{ fontSize: '18px' }}>⚡</span>
                        Create Mediator
                    </button>
                )}
                {activeTab === 'CLIENTS' && (
                    <button
                        onClick={() => handleCreate('CLIENT')}
                        style={{
                            padding: '14px 28px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 30px rgba(99, 102, 241, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>👋</span>
                        Create New Client
                    </button>
                )}
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
                </div>
            )}

            {/* Users Table */}
            <div style={{
                background: 'rgba(30, 41, 59, 0.8)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="table-responsive" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <thead>
                            <tr style={{
                                background: 'rgba(15, 23, 42, 0.5)',
                                borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
                            }}>
                                <th style={{
                                    width: activeTab === 'CLIENTS' ? '16.66%' : '15%',
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>User ID</th>
                                <th style={{
                                    width: activeTab === 'CLIENTS' ? '16.66%' : '25%',
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>{activeTab === 'CLIENTS' ? 'Client Name' : 'Mediator Name'}</th>
                                <th style={{
                                    width: activeTab === 'CLIENTS' ? '16.66%' : '25%',
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Contact</th>
                                {activeTab === 'CLIENTS' && (
                                    <>
                                        <th style={{
                                            width: '16.66%',
                                            padding: '16px 20px',
                                            textAlign: 'center',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#94a3b8',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>Credentials</th>
                                        <th style={{
                                            width: '16.66%',
                                            padding: '16px 20px',
                                            textAlign: 'center',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#94a3b8',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}>Investment</th>
                                    </>
                                )}
                                {activeTab === 'MEDIATORS' && (
                                    <th style={{
                                        width: '20%',
                                        padding: '16px 20px',
                                        textAlign: 'center',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#94a3b8',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px'
                                    }}>Created Date</th>
                                )}
                                <th style={{
                                    width: activeTab === 'CLIENTS' ? '16.66%' : '15%',
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Status</th>
                                <th style={{
                                    width: '10%',
                                    padding: '16px 20px',
                                    textAlign: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: '#94a3b8',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === 'CLIENTS' ? 7 : 6} style={{
                                        padding: '64px 20px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>👥</div>
                                        <p style={{ color: '#64748b', fontSize: '15px' }}>
                                            No {activeTab.toLowerCase()} found matching your search
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
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
                                            <UserIdBadge userId={user.userId || 'N/A'} />
                                        </td>
                                        <td data-label="Name" style={{ padding: '20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                <span style={{
                                                    fontSize: '15px',
                                                    fontWeight: '500',
                                                    color: '#f8fafc'
                                                }}>
                                                    {user.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td data-label="Contact" style={{ padding: '20px', textAlign: 'center' }}>
                                            <div>
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: '#cbd5e1',
                                                    marginBottom: '4px'
                                                }}>{user.mobile || 'N/A'}</div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: '#64748b'
                                                }}>{user.email}</div>
                                            </div>
                                        </td>
                                        {activeTab === 'CLIENTS' && (
                                            <>
                                                <td data-label="Credentials" style={{ padding: '20px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            fontFamily: 'monospace',
                                                            fontSize: '13px',
                                                            color: '#94a3b8',
                                                            background: 'rgba(15, 23, 42, 0.8)',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(148, 163, 184, 0.1)'
                                                        }}>
                                                            {showPasswords[user.id] ? 'client@321' : '••••••••'}
                                                        </span>
                                                        <button
                                                            onClick={() => togglePasswordVisibility(user.id)}
                                                            style={{
                                                                background: 'none',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                fontSize: '18px',
                                                                opacity: 0.6,
                                                                transition: 'opacity 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                                                            onMouseLeave={(e) => e.target.style.opacity = '0.6'}
                                                        >
                                                            {showPasswords[user.id] ? '🙈' : '👁️'}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td data-label="Investment" style={{
                                                    padding: '20px',
                                                    textAlign: 'center',
                                                    fontSize: '15px',
                                                    fontFamily: 'monospace',
                                                    fontWeight: '600',
                                                    color: '#cbd5e1'
                                                }}>
                                                    ₹{parseFloat(user.totalInvested || 0).toLocaleString()}
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'MEDIATORS' && (
                                            <td data-label="Created Date" style={{
                                                padding: '20px',
                                                textAlign: 'center',
                                                fontSize: '14px',
                                                color: '#cbd5e1'
                                            }}>
                                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                            </td>
                                        )}
                                        <td data-label="Status" style={{ padding: '20px', textAlign: 'center' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '6px 14px',
                                                borderRadius: '20px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                background: user.status === 'ACTIVE'
                                                    ? 'rgba(16, 185, 129, 0.15)'
                                                    : 'rgba(239, 68, 68, 0.15)',
                                                color: user.status === 'ACTIVE' ? '#6ee7b7' : '#fca5a5',
                                                border: user.status === 'ACTIVE'
                                                    ? '1px solid rgba(16, 185, 129, 0.3)'
                                                    : '1px solid rgba(239, 68, 68, 0.3)'
                                            }}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td data-label="Actions" style={{ padding: '20px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleImpersonate(user)}
                                                    title="Login as User"
                                                    style={{
                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                        border: 'none',
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '8px',
                                                        color: '#818cf8',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.background = 'rgba(99, 102, 241, 0.2)';
                                                        e.target.style.transform = 'translateY(-1px)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.background = 'rgba(99, 102, 241, 0.1)';
                                                        e.target.style.transform = 'translateY(0)';
                                                    }}
                                                >
                                                    <Key size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    style={{
                                                        background: 'rgba(99, 102, 241, 0.1)',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        padding: '8px',
                                                        color: '#818cf8',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                                    title="Edit User"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showForm && createPortal(
                <>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(15, 23, 42, 0.8)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 1000
                        }}
                        className="animate-fade-in"
                        onClick={() => setShowForm(false)}
                    />
                    <div
                        style={{
                            position: 'fixed',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1001,
                            width: '95%',
                            maxWidth: '750px',
                            maxHeight: '90vh',
                            outline: 'none'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className="animate-scale-in"
                            style={{
                                background: 'rgba(30, 41, 59, 1)',
                                backdropFilter: 'blur(20px)',
                                borderRadius: '16px',
                                padding: '24px 32px',
                                width: '100%',
                                height: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Modal Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                flexShrink: 0 // Prevent header from shrinking
                            }}>

                                <div>
                                    <h2 style={{
                                        fontSize: '20px',
                                        fontWeight: '700',
                                        color: '#ffffff',
                                        marginBottom: '2px'
                                    }}>{editingUser ? 'Edit' : 'New'} {creationMode === 'CLIENT' ? 'Client' : 'Mediator'} Profile</h2>
                                    <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                                        Fill in the client's personal and financial details
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowForm(false); setEditingUser(null); }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '20px',
                                        color: '#64748b',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s',
                                        padding: '4px'
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                                    onMouseLeave={(e) => e.target.style.color = '#64748b'}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit}>
                                {/* Personal Information */}
                                <div style={{ marginBottom: '16px' }}>
                                    <h3 style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#a5b4fc',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px'
                                    }}>Personal Information</h3>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '12px'
                                    }}>
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#cbd5e1',
                                                marginBottom: '6px'
                                            }}>Full Name</label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                placeholder={creationMode === 'CLIENT' ? "Sarah Connor" : "John Doe"}
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    padding: '0 12px',
                                                    fontSize: '14px',
                                                    color: '#f8fafc',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    border: errors.fullName ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                    borderRadius: '8px',
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#6366f1';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = errors.fullName ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#cbd5e1',
                                                marginBottom: '6px'
                                            }}>Phone Number</label>
                                            <input
                                                type="tel"
                                                name="phoneNumber"
                                                placeholder="9876543210"
                                                value={formData.phoneNumber}
                                                onChange={handleChange}
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    padding: '0 12px',
                                                    fontSize: '14px',
                                                    color: '#f8fafc',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    border: errors.phoneNumber ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                    borderRadius: '8px',
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#6366f1';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = errors.phoneNumber ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>

                                        {creationMode === 'CLIENT' ? (
                                            <div>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#cbd5e1',
                                                    marginBottom: '6px'
                                                }}>City</label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    placeholder="Los Angeles"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    disabled={!!editingUser}
                                                    style={{
                                                        width: '100%',
                                                        height: '40px',
                                                        padding: '0 12px',
                                                        fontSize: '14px',
                                                        color: '#f8fafc',
                                                        background: 'rgba(15, 23, 42, 0.6)',
                                                        border: errors.city ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                        borderRadius: '8px',
                                                        outline: 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = '#6366f1';
                                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = errors.city ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#cbd5e1',
                                                    marginBottom: '6px'
                                                }}>Email Address</label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="mediator@company.com"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    style={{
                                                        width: '100%',
                                                        height: '40px',
                                                        padding: '0 12px',
                                                        fontSize: '14px',
                                                        color: '#f8fafc',
                                                        background: 'rgba(15, 23, 42, 0.6)',
                                                        border: errors.email ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                        borderRadius: '8px',
                                                        outline: 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = '#6366f1';
                                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = errors.email ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{
                                    height: '1px',
                                    background: 'rgba(148, 163, 184, 0.1)',
                                    margin: '16px 0'
                                }}></div>

                                {/* Financial Information (Clients Only) */}
                                {creationMode === 'CLIENT' && (
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#a5b4fc',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px',
                                            marginBottom: '12px'
                                        }}>Financial Details</h3>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: '12px'
                                        }}>
                                            <div>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#cbd5e1',
                                                    marginBottom: '6px'
                                                }}>Initial Investment ($)</label>
                                                <input
                                                    type="number"
                                                    name="investmentAmount"
                                                    placeholder="50000"
                                                    value={formData.investmentAmount}
                                                    onChange={handleChange}
                                                    disabled={!!editingUser}
                                                    style={{
                                                        width: '100%',
                                                        height: '40px',
                                                        padding: '0 12px',
                                                        fontSize: '14px',
                                                        color: '#f8fafc',
                                                        background: 'rgba(15, 23, 42, 0.6)',
                                                        border: errors.investmentAmount ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                        borderRadius: '8px',
                                                        outline: 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = '#6366f1';
                                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = errors.investmentAmount ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{
                                                    display: 'block',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    color: '#cbd5e1',
                                                    marginBottom: '6px'
                                                }}>Profit Percentage (%)</label>
                                                <input
                                                    type="number"
                                                    name="percentageOffered"
                                                    placeholder="15.5"
                                                    step="0.01"
                                                    value={formData.percentageOffered}
                                                    onChange={handleChange}
                                                    disabled={!!editingUser}
                                                    style={{
                                                        width: '100%',
                                                        height: '40px',
                                                        padding: '0 12px',
                                                        fontSize: '14px',
                                                        color: '#f8fafc',
                                                        background: 'rgba(15, 23, 42, 0.6)',
                                                        border: errors.percentageOffered ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                        borderRadius: '8px',
                                                        outline: 'none',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = '#6366f1';
                                                        e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = errors.percentageOffered ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Security & Access (Both) */}
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#a5b4fc',
                                        textTransform: 'uppercase',
                                        letterSpacing: '1px',
                                        marginBottom: '12px'
                                    }}>Security & Access</h3>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: '12px'
                                    }}>
                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#cbd5e1',
                                                marginBottom: '6px'
                                            }}>
                                                Password
                                                <span style={{ fontWeight: 400, opacity: 0.7, fontSize: '11px', marginLeft: '6px' }}>
                                                    {editingUser ? '(Leave empty to keep unchanged)' : `(Blank = ${creationMode === 'CLIENT' ? 'client@321' : 'agent@321'})`}
                                                </span>
                                            </label>
                                            <input
                                                type="password"
                                                name="password"
                                                placeholder="••••••••"
                                                value={formData.password}
                                                onChange={handleChange}
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    padding: '0 12px',
                                                    fontSize: '14px',
                                                    color: '#f8fafc',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    border: errors.password ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                                    borderRadius: '8px',
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#6366f1';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = errors.password ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.2)';
                                                    e.target.style.boxShadow = 'none';
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{
                                                display: 'block',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#cbd5e1',
                                                marginBottom: '6px'
                                            }}>Status</label>
                                            <select
                                                name="status"
                                                value={formData.status}
                                                onChange={handleChange}
                                                style={{
                                                    width: '100%',
                                                    height: '40px',
                                                    padding: '0 12px',
                                                    fontSize: '14px',
                                                    color: '#f8fafc',
                                                    background: 'rgba(15, 23, 42, 0.6)',
                                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                                    borderRadius: '8px',
                                                    outline: 'none',
                                                    transition: 'all 0.3s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = '#6366f1';
                                                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                                                }}
                                            >
                                                <option value="ACTIVE">ACTIVE</option>
                                                <option value="BLOCKED">BLOCKED</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    justifyContent: 'flex-end',
                                    marginTop: '8px'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowForm(false); setEditingUser(null); }}
                                        style={{
                                            padding: '10px 20px',
                                            background: 'rgba(15, 23, 42, 0.8)',
                                            border: '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '8px',
                                            color: '#cbd5e1',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(15, 23, 42, 1)'}
                                        onMouseLeave={(e) => e.target.style.background = 'rgba(15, 23, 42, 0.8)'}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            padding: '10px 24px',
                                            background: submitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#ffffff',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: submitting ? 'not-allowed' : 'pointer',
                                            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                                            transition: 'all 0.3s ease',
                                            opacity: submitting ? 0.7 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!submitting) {
                                                e.target.style.transform = 'translateY(-2px)';
                                                e.target.style.boxShadow = '0 6px 30px rgba(99, 102, 241, 0.5)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.transform = 'translateY(0)';
                                            e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)';
                                        }}
                                    >
                                        {submitting && (
                                            <div className="animate-spin" style={{
                                                width: '14px',
                                                height: '14px',
                                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                                borderTopColor: '#ffffff',
                                                borderRadius: '50%'
                                            }}></div>
                                        )}
                                        <span>{submitting ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update' : 'Create')}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Success Modal */}
            {successModal.show && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: '16px',
                        padding: '32px',
                        width: '90%',
                        maxWidth: '400px',
                        textAlign: 'center',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        animation: 'scaleIn 0.3s ease-out'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            color: '#10b981'
                        }}>
                            <Check size={32} />
                        </div>

                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#f8fafc',
                            marginBottom: '8px'
                        }}>Success!</h3>

                        <p style={{
                            color: '#94a3b8',
                            fontSize: '14px',
                            marginBottom: '24px'
                        }}>{successModal.message}</p>

                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px'
                        }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Generated User ID</div>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: '#f8fafc', fontFamily: 'monospace' }}>
                                    {successModal.userId}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(successModal.userId);
                                    // Could show temporary "Copied!" state but native behavior is close loop
                                }}
                                style={{
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    color: '#818cf8',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                title="Copy User ID"
                                onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.1)'}
                            >
                                <Copy size={20} />
                            </button>
                        </div>

                        <button
                            onClick={() => setSuccessModal({ ...successModal, show: false })}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#6366f1',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#ffffff',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = '#4f46e5'}
                            onMouseLeave={(e) => e.target.style.background = '#6366f1'}
                        >
                            Done
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CreateUser;
