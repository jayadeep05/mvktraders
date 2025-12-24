import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { TrendingUp, ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowRight, BarChart3 } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    // Clear session whenever user lands on Login page
    useEffect(() => {
        authService.logout();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authService.login(email, password);
            const token = data.access_token;
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);

            if (role === 'ROLE_ADMIN' || role === 'ADMIN' || role === 'ROLE_MEDIATOR' || role === 'MEDIATOR') {
                navigate('/admin/clients', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Check your credentials and try again';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
            fontFamily: "'Outfit', sans-serif",
            position: 'relative',
            overflow: 'hidden',
            padding: '20px'
        }}>
            {/* --- Premium Background Effects --- */}
            <div style={{
                position: 'absolute',
                top: '10%',
                left: '15%',
                width: '400px',
                height: '400px',
                background: 'rgba(99, 102, 241, 0.15)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '10%',
                right: '15%',
                width: '400px',
                height: '400px',
                background: 'rgba(139, 92, 246, 0.15)',
                filter: 'blur(100px)',
                borderRadius: '50%',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, transparent 0%, #020617 100%)',
                zIndex: 1
            }} />

            {/* --- Login Card Container --- */}
            <div className="login-card-reveal" style={{
                width: '100%',
                maxWidth: '460px',
                zIndex: 10,
                position: 'relative'
            }}>
                {/* Brand Header */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)',
                        marginBottom: '20px'
                    }}>
                        <BarChart3 size={32} color="#fff" />
                    </div>
                    <h1 className="brand-title" style={{
                        fontSize: '32px',
                        fontWeight: '800',
                        color: '#fff',
                        margin: 0,
                        letterSpacing: '-1px'
                    }}>
                        MVK<span style={{ color: '#818cf8' }}>TRADERS</span>
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#94a3b8',
                        marginTop: '8px',
                        fontWeight: '400'
                    }}>
                        Secure terminal for wealth management
                    </p>
                </div>

                {/* The Form Card */}
                <div className="login-card-form" style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <form onSubmit={handleLogin}>
                        {/* Error Space */}
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                marginBottom: '24px',
                                color: '#fca5a5',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <span style={{ opacity: 0.8 }}>⚠️</span>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                color: '#94a3b8',
                                fontSize: '13px',
                                fontWeight: '600',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                User Identity
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#64748b'
                                }} />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter UserId or Email"
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        border: '1px solid rgba(148, 163, 184, 0.1)',
                                        borderRadius: '14px',
                                        padding: '14px 16px 14px 48px',
                                        color: '#fff',
                                        fontSize: '15px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit'
                                    }}
                                    className="login-input"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{
                                display: 'block',
                                color: '#94a3b8',
                                fontSize: '13px',
                                fontWeight: '600',
                                marginBottom: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Security Key
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#64748b'
                                }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'rgba(15, 23, 42, 0.4)',
                                        border: '1px solid rgba(148, 163, 184, 0.1)',
                                        borderRadius: '14px',
                                        padding: '14px 48px 14px 48px',
                                        color: '#fff',
                                        fontSize: '15px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit'
                                    }}
                                    className="login-input"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                height: '52px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                                border: 'none',
                                borderRadius: '14px',
                                color: '#fff',
                                fontSize: '16px',
                                fontWeight: '700',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                boxShadow: '0 8px 20px -6px rgba(99, 102, 241, 0.4)',
                                transition: 'all 0.3s ease'
                            }}
                            className="login-btn"
                        >
                            {loading ? (
                                <div className="loader-ring" />
                            ) : (
                                <>
                                    Sign In <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Trust Badges */}
                <div style={{
                    marginTop: '32px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '24px',
                    opacity: 0.8
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <ShieldCheck size={16} color="#10b981" />
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>AES-256 Encryption</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <TrendingUp size={16} color="#3b82f6" />
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>Real-time Sync</span>
                    </div>
                </div>
            </div>

            {/* Animations & Interactive Styling */}
            <style>{`
                .login-card-reveal {
                    animation: cardReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                @media (max-width: 480px) {
                    .login-card-form {
                        padding: 30px 24px !important;
                    }
                    .brand-title {
                        font-size: 28px !important;
                    }
                }

                @keyframes cardReveal {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .login-input:focus {
                    background: rgba(15, 23, 42, 0.6) !important;
                    border-color: #6366f1 !important;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1) !important;
                }

                .login-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px -8px rgba(99, 102, 241, 0.5);
                    filter: brightness(1.1);
                }

                .login-btn:active:not(:disabled) {
                    transform: translateY(0);
                }

                .loader-ring {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid #fff;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Login;

