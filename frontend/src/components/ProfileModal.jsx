import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Phone, Calendar, Hash, BadgeCheck, User } from 'lucide-react';

const ProfileModal = ({ isOpen, onClose, userInfo, portfolio }) => {
    // Prevent background scrolling
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 7, 10, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                background: '#1e293b',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '400px',
                padding: '0',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                position: 'relative',
                overflow: 'hidden',
                animation: 'scaleIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header / Banner */}
                <div style={{ height: '110px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', position: 'relative' }}>
                    <button onClick={onClose} style={{
                        position: 'absolute', top: '16px', right: '16px',
                        background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '50%',
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)',
                        transition: 'background 0.2s'
                    }}
                        onMouseEnter={e => e.target.style.background = 'rgba(0,0,0,0.4)'}
                        onMouseLeave={e => e.target.style.background = 'rgba(0,0,0,0.2)'}
                    >
                        <X size={18} />
                    </button>

                    <div style={{ position: 'absolute', bottom: '-40px', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '88px', height: '88px', borderRadius: '50%',
                            background: '#1e293b', padding: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: '#334155', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '36px', fontWeight: 'bold'
                            }}>
                                {userInfo?.name?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Container */}
                <div style={{ padding: '48px 24px 24px' }}>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{userInfo?.name}</h2>
                        <p style={{ fontSize: '13px', color: '#94a3b8' }}>{userInfo?.email}</p>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', marginTop: '12px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></div>
                            Active Account
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                        {/* User ID */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '6px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px' }}>
                                    <Hash size={14} color="#94a3b8" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>User ID</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#fff', fontFamily: 'monospace', fontWeight: '600' }}>{userInfo?.userId}</span>
                        </div>

                        {/* Phone */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '6px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px' }}>
                                    <Phone size={14} color="#94a3b8" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Phone</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#fff' }}>+91 98765 43210</span>
                        </div>

                        {/* City */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '6px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px' }}>
                                    <MapPin size={14} color="#94a3b8" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Location</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#fff' }}>Kochi, India</span>
                        </div>

                        {/* Joined Date */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '12px', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '6px', background: 'rgba(148, 163, 184, 0.1)', borderRadius: '8px' }}>
                                    <Calendar size={14} color="#94a3b8" />
                                </div>
                                <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Joined On</span>
                            </div>
                            <span style={{ fontSize: '13px', color: '#fff' }}>Aug 15, 2024</span>
                        </div>

                        {/* Net Investment */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BadgeCheck size={18} color="#6366f1" />
                                <span style={{ fontSize: '13px', color: '#e0e7ff', fontWeight: '600' }}>Net Invested</span>
                            </div>
                            <span style={{ fontSize: '18px', color: '#fff', fontWeight: '700', fontFamily: 'monospace' }}>
                                ₹{portfolio?.totalInvested?.toLocaleString() || 0}
                            </span>
                        </div>

                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProfileModal;
