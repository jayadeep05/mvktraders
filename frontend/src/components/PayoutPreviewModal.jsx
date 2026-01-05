import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Maximize2, Image as ImageIcon, Clock } from 'lucide-react';

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const API_BASE = '/api';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${API_BASE}/uploads/${cleanPath}`;
};

const PayoutPreviewModal = ({ show, onClose, payout }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [copied, setCopied] = useState(false);
    const [imageZoomed, setImageZoomed] = useState(false);
    const [imgSrc, setImgSrc] = useState(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (show && payout) {
            const rawPath = payout.screenshot || payout.screenshotPath || payout.proof || null;
            setImgSrc(getImageUrl(rawPath));
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setImageZoomed(false);
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [show, payout]);

    // Close on ESC
    useEffect(() => {
        if (!show) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                if (imageZoomed) setImageZoomed(false);
                else onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, onClose, imageZoomed]);

    const handleCopy = () => {
        if (!payout) return;
        const msg = payout.message || payout.messageContent || payout.remarks || '';
        navigator.clipboard.writeText(msg);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!show || !payout) return null;

    const messageContent = payout.message || payout.messageContent || payout.remarks || payout.description || "No message content available.";

    // Dark Theme Colors
    const colors = {
        overlay: 'rgba(0, 0, 0, 0.75)',
        cardBg: '#1e293b', // Slate 800 - dark but not pitch black
        headerBg: 'rgba(30, 41, 59, 0.95)',
        contentBg: '#0f172a', // Slate 900
        textMain: '#f8fafc',
        textMuted: '#94a3b8',
        border: 'rgba(148, 163, 184, 0.1)',
        accent: '#6366f1',
        success: '#10b981'
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(5, 7, 10, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
    };

    const cardStyle = {
        background: colors.cardBg,
        width: '100%',
        maxWidth: '900px', // Slightly narrower for better reading
        maxHeight: '85vh',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'scaleIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
        transformOrigin: 'center center'
    };

    const headerStyle = {
        padding: '16px 24px',
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: colors.headerBg,
    };

    const contentContainerStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: colors.contentBg,
        flex: 1, // Take remaining height
        overflow: 'hidden'
    };

    const sectionStyle = {
        flex: 1, padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        overflowY: 'auto',
        minHeight: isMobile ? '300px' : 'auto',
        maxHeight: isMobile ? '50vh' : 'auto',
    };

    return createPortal(
        <div style={overlayStyle} onClick={onClose}>
            {/* Fullscreen Image Preview */}
            {imageZoomed && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', animation: 'fadeIn 0.2s' }} onClick={(e) => { e.stopPropagation(); setImageZoomed(false); }}>
                    <img src={imgSrc} style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }} alt="Proof Fullscreen" />
                    <button style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={20} />
                    </button>
                </div>
            )}

            <div style={cardStyle} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={headerStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: colors.textMain, margin: 0, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Payout Details</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                <span style={{ fontSize: '10px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>#{payout.id || '---'}</span>
                                {payout.createdAt || payout.date ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: colors.textMuted }}>
                                        <Clock size={10} />
                                        <span>
                                            {new Date(payout.createdAt || payout.date).toLocaleDateString('en-GB')} • {new Date(payout.createdAt || payout.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: '4px', display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                        onMouseLeave={e => e.currentTarget.style.color = colors.textMuted}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={contentContainerStyle}>
                    {/* Left: Proof */}
                    <div style={{ ...sectionStyle, borderRight: isMobile ? 'none' : `1px solid ${colors.border}`, borderBottom: isMobile ? `1px solid ${colors.border}` : 'none' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proof of Payment</h4>

                        <div
                            style={{
                                flex: 1,
                                border: '1px dashed rgba(148, 163, 184, 0.2)',
                                borderRadius: '12px',
                                background: 'rgba(30, 41, 59, 0.3)',
                                overflow: 'hidden',
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                minHeight: '200px',
                            }}
                            className="group"
                        >
                            {imgSrc ? (
                                <>
                                    <img src={imgSrc} alt="Proof" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
                                    <button
                                        onClick={() => setImageZoomed(true)}
                                        style={{
                                            position: 'absolute', top: '12px', right: '12px',
                                            background: 'rgba(255,255,255,0.1)',
                                            padding: '8px', borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            color: '#fff', backdropFilter: 'blur(4px)'
                                        }}
                                        title="View Fullscreen"
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    >
                                        <Maximize2 size={16} />
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', color: colors.textMuted }}>
                                    <ImageIcon size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                                    <p style={{ fontSize: '12px', margin: 0 }}>No screenshot provided</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Message (Compact View) */}
                    <div style={sectionStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '700', color: colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message Preview</h4>
                        </div>

                        <div style={{
                            position: 'relative',
                            flex: 1,
                            background: '#1e293b', // Darker background for code block
                            borderRadius: '12px',
                            border: `1px solid ${colors.border}`,
                            // padding: '16px', // Removed padding from container to allow absolute positioning to work relative to edges cleanly?
                            // Actually, let's keep padding but positioning absolute top right will ignore padding.
                            display: 'flex', flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            {/* Floating Copy Button */}
                            <button
                                onClick={handleCopy}
                                style={{
                                    position: 'absolute', top: '8px', right: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                    border: copied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '6px',
                                    width: '32px', height: '32px',
                                    color: copied ? '#34d399' : '#cbd5e1',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    zIndex: 10
                                }}
                                title="Copy Text"
                                onMouseEnter={e => !copied && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)')}
                                onMouseLeave={e => !copied && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>

                            <div style={{
                                flex: 1,
                                fontFamily: "'JetBrains Mono', 'Menlo', 'Courier New', monospace",
                                fontSize: '12.7px',
                                lineHeight: '1.5',
                                color: '#e2e8f0',
                                whiteSpace: 'pre-wrap',
                                overflowY: 'auto',
                                padding: '16px',
                                paddingRight: '48px', // Prevent text from going under button
                            }}>
                                {messageContent}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
                /* Custom Scrollbar for the dark theme */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); borderRadius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
            `}</style>
        </div>,
        document.body
    );
};

export default PayoutPreviewModal;
