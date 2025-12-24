import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    CreditCard,
    Clock,
    LogOut,
    X,
    ChevronRight,
    CircleUser,
    ShieldCheck,
    BarChart3,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';

const Sidebar = ({ mobile, onClose }) => {
    const navigate = useNavigate();
    const [userInfo, setUserInfo] = useState({ name: '', role: '', userId: '', email: '' });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserInfo({
                    name: payload.name || 'User',
                    userId: payload.userId || '---',
                    email: payload.sub || payload.email,
                    role: payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : '')
                });
            } catch (e) {
                console.error('Failed to decode token', e);
            }
        }
    }, []);


    const isAdmin = userInfo.role === 'ROLE_ADMIN' || userInfo.role === 'ADMIN';
    const isClient = userInfo.role === 'ROLE_CLIENT' || userInfo.role === 'CLIENT';
    const isMediator = userInfo.role === 'ROLE_MEDIATOR' || userInfo.role === 'MEDIATOR';

    const handleLinkClick = () => {
        if (mobile && onClose) onClose();
    };

    const NavItem = ({ to, icon: Icon, label, badge, onClick, color }) => {
        const content = (
            <>
                <Icon size={20} style={{ marginRight: '12px', opacity: 0.8, color: color || 'inherit' }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                    <span style={{
                        fontSize: '10px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        color: '#818cf8',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: '700'
                    }}>
                        {badge}
                    </span>
                )}
                <ChevronRight size={14} className="chevron" style={{ opacity: 0.3 }} />
            </>
        );

        if (onClick) {
            return (
                <button
                    onClick={() => { onClick(); handleLinkClick(); }}
                    className="premium-nav-item"
                    style={{ background: 'transparent', border: 'none', width: 'calc(100% - 24px)', textAlign: 'left', cursor: 'pointer' }}
                >
                    {content}
                </button>
            );
        }

        return (
            <NavLink
                to={to}
                className={({ isActive }) => `premium-nav-item ${isActive ? 'active' : ''}`}
                onClick={handleLinkClick}
            >
                {content}
            </NavLink>
        );
    };

    const sidebarStyle = mobile ? {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent'
    } : {
        height: '100vh',
        width: '280px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        left: 0,
        zIndex: 50,
        backdropFilter: 'blur(20px)'
    };

    return (
        <div style={sidebarStyle}>
            {/* Header / Brand */}
            <div style={{ padding: '32px 24px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                    }}>
                        <BarChart3 size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', margin: 0, letterSpacing: '-0.5px' }}>
                            MVK<span style={{ color: '#818cf8' }}>TRADERS</span>
                        </h1>
                        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Wealth Management
                        </p>
                    </div>
                </div>
                {mobile && (
                    <button
                        onClick={onClose}
                        style={{ position: 'absolute', right: '16px', top: '32px', background: 'transparent', border: 'none', color: '#64748b' }}
                    >
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* User Profile Card */}
            <div style={{ padding: '0 16px 24px' }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.3s'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#818cf8',
                        fontSize: '18px',
                        fontWeight: '700'
                    }}>
                        {userInfo.name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ color: '#f8fafc', fontSize: '14px', fontWeight: '600', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {userInfo.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <ShieldCheck size={12} color="#818cf8" />
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>
                                {userInfo.role.replace('ROLE_', '').toLowerCase()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav style={{ flex: 1, padding: '0 4px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} className="custom-scrollbar">
                {/* Admin/Mediator Section */}
                {(isAdmin || isMediator) && (
                    <>
                        <p style={{ padding: '0 24px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', marginTop: '8px' }}>
                            Management
                        </p>
                        <NavItem to="/admin/clients" icon={Users} label="Client Portfolios" />
                        <NavItem to="/admin/create-user" icon={UserPlus} label="User Management" />
                        {isAdmin && <NavItem to="/admin/transaction-approvals" icon={CreditCard} label="Transaction Approvals" />}
                        <NavItem to="/admin/pending-users" icon={Clock} label="User Approvals" />
                    </>
                )}

                {/* Client Section */}
                {isClient && (
                    <>
                        <p style={{ padding: '0 24px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', marginTop: '8px' }}>
                            Finance
                        </p>
                        <NavItem to="/dashboard" icon={LayoutDashboard} label="My Overview" />
                        {mobile && (
                            <>
                                <NavItem
                                    onClick={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
                                    icon={Clock}
                                    label="Transaction History"
                                />
                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '12px 24px' }} />
                                <NavItem
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-deposit'))}
                                    icon={ArrowUpRight}
                                    label="Add Funds"
                                    color="#10b981"
                                />
                                <NavItem
                                    onClick={() => window.dispatchEvent(new CustomEvent('open-withdrawal'))}
                                    icon={ArrowDownLeft}
                                    label="Withdraw"
                                    color="#f43f5e"
                                />
                            </>
                        )}
                    </>
                )}

            </nav>

            {/* Footer */}
            <div style={{ padding: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#475569' }}>Trusted. Secure. Reliable.</span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)' }} />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;

