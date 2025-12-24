import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { authService } from '../services/api';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ProfileModal from '../components/ProfileModal';
import { ChevronDown, LogOut, UserCircle, KeyRound, Menu, X, Bell } from 'lucide-react';
import { adminService, depositService, withdrawalService } from '../services/api';

const ProtectedLayout = () => {
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({ name: '', email: '', id: '', role: '' });
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Refs for click-outside detection
    const mobileNotifRef = useRef(null);
    const mobileProfileRef = useRef(null);
    const desktopNotifRef = useRef(null);
    const desktopProfileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close Notifications if clicked outside both mobile and desktop notif containers
            if (showNotifications) {
                const clickedMobile = mobileNotifRef.current && mobileNotifRef.current.contains(event.target);
                const clickedDesktop = desktopNotifRef.current && desktopNotifRef.current.contains(event.target);
                if (!clickedMobile && !clickedDesktop) {
                    setShowNotifications(false);
                }
            }

            // Close User Menu if clicked outside both mobile and desktop user menu containers
            if (showUserMenu) {
                const clickedMobile = mobileProfileRef.current && mobileProfileRef.current.contains(event.target);
                const clickedDesktop = desktopProfileRef.current && desktopProfileRef.current.contains(event.target);
                if (!clickedMobile && !clickedDesktop) {
                    setShowUserMenu(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications, showUserMenu]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserInfo({
                    name: payload.name || 'User',
                    email: payload.sub || payload.email,
                    userId: payload.userId || '---',
                    role: payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : '')
                });
            } catch (e) {
                console.error('Failed to decode token', e);
            }
        }
    }, []);

    const fetchNotifications = async () => {
        if (userInfo.role === 'ROLE_ADMIN' || userInfo.role === 'ADMIN') {
            try {
                const [deposits, withdrawals, users] = await Promise.all([
                    depositService.getAllRequests('PENDING'),
                    withdrawalService.getAllRequests(),
                    adminService.getPendingUsers()
                ]);

                // Filter withdrawals for pending status if they aren't already filtered
                const pendingWithdrawals = (withdrawals || []).filter(w => w.status === 'PENDING');
                const pendingDeposits = deposits || [];
                const pendingUsers = users || [];

                const combined = [
                    ...pendingDeposits.map(d => ({ ...d, type: 'DEPOSIT' })),
                    ...pendingWithdrawals.map(w => ({ ...w, type: 'WITHDRAWAL' })),
                    ...pendingUsers.map(u => ({ ...u, type: 'USER_REGISTRATION' }))
                ];

                setNotifications(combined.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)));
                setUnreadCount(combined.length);
            } catch (error) {
                console.error("Failed to fetch notifications", error);
            }
        }
    };

    useEffect(() => {
        if (userInfo.role) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
            return () => clearInterval(interval);
        }
    }, [userInfo.role]);

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

    const handleLogout = () => {
        authService.logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="layout-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>

            <div className="sidebar-desktop">
                <Sidebar />
            </div>

            {/* Mobile Header */}
            <div className="mobile-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
                        <Menu size={24} />
                    </button>
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: '18px' }}>MK TRADERS</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Mobile Notification Bell */}
                    {(userInfo.role === 'ROLE_ADMIN' || userInfo.role === 'ADMIN') && (
                        <div style={{ position: 'relative' }} ref={mobileNotifRef}>
                            <button
                                onClick={() => {
                                    setShowNotifications(!showNotifications);
                                    setShowUserMenu(false);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: unreadCount > 0 ? '#6366f1' : '#fff',
                                    position: 'relative',
                                    padding: '4px'
                                }}
                            >
                                <Bell size={24} />
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        width: '8px',
                                        height: '8px',
                                        background: '#f43f5e',
                                        borderRadius: '50%',
                                        display: 'block'
                                    }} />
                                )}
                            </button>

                            {showNotifications && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 12px)',
                                    right: '-50px',
                                    width: '320px',
                                    maxWidth: 'calc(100vw - 32px)',
                                    background: '#1e293b',
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                                    zIndex: 100,
                                    overflow: 'hidden',
                                    animation: 'scaleIn 0.2s ease-out'
                                }}>
                                    <div style={{ padding: '16px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: '600' }}>Notifications</h3>
                                        <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                                            {notifications.length} Pending
                                        </span>
                                    </div>
                                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                                <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                                <p style={{ margin: 0, fontSize: '14px' }}>No pending requests</p>
                                            </div>
                                        ) : (
                                            notifications.map((n, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        setShowNotifications(false);
                                                        if (n.type === 'USER_REGISTRATION') {
                                                            navigate('/admin/pending-users');
                                                        } else {
                                                            navigate('/admin/transaction-approvals');
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                        <div style={{
                                                            width: '36px', height: '36px', borderRadius: '10px',
                                                            background: n.type === 'DEPOSIT' ? 'rgba(16, 185, 129, 0.1)' : n.type === 'USER_REGISTRATION' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: n.type === 'DEPOSIT' ? '#10b981' : n.type === 'USER_REGISTRATION' ? '#6366f1' : '#f43f5e',
                                                            flexShrink: 0
                                                        }}>
                                                            {n.type === 'DEPOSIT' ? '+' : n.type === 'USER_REGISTRATION' ? 'U' : '-'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                                                                    {n.type === 'DEPOSIT' ? 'Deposit Request' : n.type === 'USER_REGISTRATION' ? 'New User Signup' : 'Withdrawal Request'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                    {new Date(n.createdAt || n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                                                                {n.type === 'USER_REGISTRATION' ? (
                                                                    <span>{n.name} <span style={{ color: '#818cf8' }}>{n.userId}</span></span>
                                                                ) : (
                                                                    <span>New request for ₹{n.amount?.toLocaleString()}</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={() => { setShowNotifications(false); navigate('/admin/transaction-approvals'); }}
                                            style={{
                                                width: '100%', padding: '12px', background: 'rgba(255, 255, 255, 0.03)',
                                                border: 'none', borderTop: '1px solid rgba(148, 163, 184, 0.1)', color: '#6366f1',
                                                fontSize: '13px', fontWeight: '600'
                                            }}
                                        >
                                            View All Approvals
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Mobile Profile Logic */}
                    <div style={{ position: 'relative' }} ref={mobileProfileRef}>
                        <div
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 'bold', cursor: 'pointer'
                            }}>
                            {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
                        </div>

                        {/* Mobile Dropdown */}
                        {showUserMenu && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 12px)',
                                right: 0,
                                background: '#1e293b',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: '12px',
                                padding: '8px',
                                width: '200px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                zIndex: 100,
                                animation: 'scaleIn 0.2s ease-out'
                            }}>
                                <button
                                    onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }}
                                    style={{
                                        width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'transparent', border: 'none', borderRadius: '8px', color: '#cbd5e1',
                                        cursor: 'pointer', textAlign: 'left', fontSize: '14px', transition: 'background 0.2s', marginBottom: '2px'
                                    }}
                                >
                                    <UserCircle size={16} /> Profile
                                </button>
                                <button
                                    onClick={() => { setShowUserMenu(false); setShowChangePasswordModal(true); }}
                                    style={{
                                        width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'transparent', border: 'none', borderRadius: '8px', color: '#cbd5e1',
                                        cursor: 'pointer', textAlign: 'left', fontSize: '14px', transition: 'background 0.2s'
                                    }}
                                >
                                    <KeyRound size={16} /> Change Password
                                </button>
                                <div style={{ height: '1px', background: 'rgba(148, 163, 184, 0.1)', margin: '4px 0' }} />
                                <button
                                    onClick={handleLogout}
                                    style={{
                                        width: '100%', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'transparent', border: 'none', borderRadius: '8px', color: '#fb7185',
                                        cursor: 'pointer', textAlign: 'left', fontSize: '14px', transition: 'background 0.2s'
                                    }}
                                >
                                    <LogOut size={16} /> Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Drawer Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Mobile Drawer */}
            <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
                <Sidebar mobile={true} onClose={() => setMobileMenuOpen(false)} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0 }}>
                {/* Desktop Header Controls (Hidden on Mobile) */}
                <style>{`
                    @media (max-width: 768px) {
                        .desktop-header-controls { display: none !important; }
                    }
                `}</style>
                <div className="desktop-header-controls" style={{
                    position: 'absolute',
                    top: '32px',
                    right: '32px',
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    {/* Notification Bell */}
                    {(userInfo.role === 'ROLE_ADMIN' || userInfo.role === 'ADMIN') && (
                        <div style={{ position: 'relative' }} ref={desktopNotifRef}>
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
                                    color: unreadCount > 0 ? '#6366f1' : '#94a3b8',
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
                                {unreadCount > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
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
                                        <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: '600' }}>Notifications</h3>
                                        <span style={{ fontSize: '12px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '999px', fontWeight: '600' }}>
                                            {notifications.length} Pending
                                        </span>
                                    </div>
                                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                                <Bell size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                                <p style={{ margin: 0, fontSize: '14px' }}>No pending requests</p>
                                            </div>
                                        ) : (
                                            notifications.map((n, i) => (
                                                <div
                                                    key={i}
                                                    onClick={() => {
                                                        setShowNotifications(false);
                                                        if (n.type === 'USER_REGISTRATION') {
                                                            navigate('/admin/pending-users');
                                                        } else {
                                                            navigate('/admin/transaction-approvals');
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '12px 16px',
                                                        borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                                                        cursor: 'pointer',
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
                                                                n.type === 'USER_REGISTRATION' ? 'rgba(99, 102, 241, 0.1)' :
                                                                    'rgba(244, 63, 94, 0.1)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            color: n.type === 'DEPOSIT' ? '#10b981' :
                                                                n.type === 'USER_REGISTRATION' ? '#6366f1' :
                                                                    '#f43f5e',
                                                            flexShrink: 0
                                                        }}>
                                                            {n.type === 'DEPOSIT' ? '+' : n.type === 'USER_REGISTRATION' ? 'U' : '-'}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f8fafc' }}>
                                                                    {n.type === 'DEPOSIT' ? 'Deposit Request' :
                                                                        n.type === 'USER_REGISTRATION' ? 'New User Signup' :
                                                                            'Withdrawal Request'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                                    {new Date(n.createdAt || n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: '1.4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                {n.type === 'USER_REGISTRATION' ? (
                                                                    <>
                                                                        <span>{n.name || 'New User'}</span>
                                                                        <span style={{ color: '#818cf8', fontWeight: '600', fontSize: '11px' }}>{n.userId || n.user?.userId}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>
                                                                            New request for ₹{n.amount?.toLocaleString()}
                                                                        </span>
                                                                        <span style={{ color: '#818cf8', fontWeight: '600', fontSize: '11px' }}>{n.userId || n.user?.userId}</span>
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={() => {
                                                setShowNotifications(false);
                                                navigate('/admin/transaction-approvals');
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                border: 'none',
                                                borderTop: '1px solid rgba(148, 163, 184, 0.1)',
                                                color: '#6366f1',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            View All Approvals
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                    <div style={{ position: 'relative' }} ref={desktopProfileRef}>
                        <button
                            className="desktop-user-menu"
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
                                {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
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
                                    {userInfo.role === 'ROLE_ADMIN' ? 'Administrator' :
                                        userInfo.role === 'ROLE_MEDIATOR' ? 'Mediator' : userInfo.name}
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

                <div style={{ flex: 1, position: 'relative' }}>
                    <Outlet />
                </div>
            </div>

            <ChangePasswordModal show={showChangePasswordModal} onClose={() => setShowChangePasswordModal(false)} />
            <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userInfo={userInfo} />
        </div>
    );
};

export default ProtectedLayout;
