import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, TrendingUp, CheckCircle, Info, CalendarCheck, DollarSign, ArrowRight } from 'lucide-react';
import { depositService } from '../services/api';

const DepositRequestModal = ({ show, onClose, onSuccess, userId, portfolio, isAdmin = false }) => {
    const [step, setStep] = useState(1); // 1: Input, 2: Confirm
    const [amountStr, setAmountStr] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    // Reset logic
    useEffect(() => {
        if (show) {
            setStep(1);
            setAmountStr('');
            setError('');
            setIsConfirming(false);
            document.body.style.overflow = 'hidden';
            // Push state for back button handling
            window.history.pushState({ modalOpen: true }, '');
        } else {
            document.body.style.overflow = 'unset';
            setSubmitting(false);
        }

        const handlePopState = () => { onClose(); };
        window.addEventListener('popstate', handlePopState);
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('popstate', handlePopState);
        };
    }, [show]);

    // Close on ESC
    useEffect(() => {
        if (!show) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, onClose]);

    if (!show) return null;

    // --- Calculations ---
    const currentInvested = portfolio?.totalInvested || 0;
    const profitPercentage = (portfolio?.profitPercentage && portfolio.profitPercentage > 0) ? portfolio.profitPercentage : 4.0;
    const currentMonthlyProfit = currentInvested * (profitPercentage / 100);

    const amount = parseFloat(amountStr) || 0;
    const isValidAmount = !isNaN(amount) && amount > 0;

    const newInvested = currentInvested + amount;
    const nextMonthProfit = newInvested * (profitPercentage / 100);

    const handleReview = () => {
        if (!isValidAmount) { setError('Please enter a valid amount.'); return; }
        setError('');
        setIsConfirming(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            let response;
            if (isAdmin && userId) {
                response = await depositService.createRequestForUser(userId, amount, 'Admin Initiated');
            } else if (userId && (localStorage.getItem('token') && (JSON.parse(atob(localStorage.getItem('token').split('.')[1])).rol || []).includes('ROLE_MEDIATOR'))) {
                const { mediatorService } = await import('../services/api');
                response = await mediatorService.createDepositRequest(userId, amount, 'Mediator Initiated');
            } else {
                response = await depositService.createRequest(amount, '');
            }
            if (onSuccess) onSuccess(response.request);
            onClose();
        } catch (err) {
            console.error('Deposit Error:', err);
            setError(err.response?.data?.message || 'Failed to submit request.');
            setSubmitting(false);
            setIsConfirming(false);
        }
    };

    // -------------------------------------------------------------------------
    // 🎨 UI Components (Internal - Copied from WithdrawModal)
    // -------------------------------------------------------------------------
    const InfoCard = ({ label, current, projected, icon: Icon, isImpacted, highlightColor }) => {
        const hasChanged = Math.abs(current - projected) > 0.1 && amount > 0;
        const activeColor = highlightColor;

        return (
            <div style={{
                background: 'rgba(30, 41, 59, 0.4)', // Very subtle slate
                borderRadius: '16px',
                padding: '17px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.3s ease',
                border: hasChanged ? `1px solid ${activeColor}40` : '1px solid rgba(255,255,255,0.03)',
                boxShadow: (!amount || amount <= 0)
                    ? '0 4px 20px rgba(0, 0, 0, 0.2)'
                    : (amount > 0 && hasChanged ? `0 4px 20px ${activeColor}20` : '0 4px 20px rgba(0, 0, 0, 0.2)'),
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1px' }}>
                    <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                        <Icon size={16} color="#e2e8f0" />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#e2e8f0' }}>
                        {label}
                    </span>
                </div>

                {/* Value Area */}
                <div>
                    {hasChanged ? (
                        <div className="animate-fade-in-up">
                            {/* Previous Value (Small) */}
                            <div style={{ fontSize: '13px', color: '#64748b', textDecoration: 'line-through', marginBottom: '4px' }}>
                                ₹{Math.round(current).toLocaleString('en-IN')}
                            </div>
                            {/* New Value (Large) */}
                            <div style={{ fontSize: '24px', fontWeight: '700', color: activeColor, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                                ₹{Math.round(projected).toLocaleString('en-IN')}
                            </div>
                        </div>
                    ) : (
                        // Static Value
                        <div style={{ fontSize: '24px', fontWeight: '700', color: amount > 0 ? activeColor : '#f8fafc', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '18px' }}>
                            ₹{Math.round(current).toLocaleString('en-IN')}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(5, 7, 10, 0.8)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
            padding: '20px'
        }} onClick={onClose}>
            <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>

            <div style={{
                width: '100%', maxWidth: '700px',
                background: '#131823', // Deep, calm background
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                margin: '16px'
            }} onClick={e => e.stopPropagation()} className="animate-scale-in">

                {/* 1️⃣ Header Section */}
                <div style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                            Add Funds
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '13px' }}>
                            Enter amount to increase your portfolio value
                        </p>
                    </div>
                    <button onClick={onClose} style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        <X size={20} />
                    </button>
                </div>

                {/* 2️⃣ Main Input Section */}
                <div style={{ padding: '0 24px', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Input Field - Full Width */}
                    <div style={{
                        position: 'relative', width: '100%',
                        background: 'rgba(15, 23, 42, 0.4)', borderRadius: '16px', border: '1px solid rgba(148, 163, 184, 0.1)',
                        padding: '12px 16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: '24px', color: '#64748b', fontWeight: '400', marginRight: '8px' }}>₹</span>
                            <input
                                type="number"
                                value={amountStr}
                                onChange={(e) => { setAmountStr(e.target.value); setError(''); setIsConfirming(false); }}
                                placeholder="0"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    fontSize: '32px',
                                    fontWeight: '700',
                                    color: '#fff',
                                    outline: 'none',
                                    fontFamily: 'monospace',
                                    letterSpacing: '-1px',
                                    minWidth: 0
                                }}
                                autoFocus
                            />
                        </div>
                        {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', marginLeft: '4px' }}>{error}</p>}
                    </div>

                    {/* Chips - The "Add Funds Feature" requested */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[5000, 10000, 25000].map(val => (
                            <button key={val} type="button" onClick={() => setAmountStr(val.toString())}
                                style={{
                                    padding: '8px 16px', borderRadius: '12px',
                                    background: parseFloat(amountStr) === val ? '#3b82f6' : 'rgba(30, 41, 59, 0.6)',
                                    border: parseFloat(amountStr) === val ? '1px solid #3b82f6' : '1px solid rgba(148, 163, 184, 0.1)',
                                    color: parseFloat(amountStr) === val ? '#fff' : '#94a3b8',
                                    fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s',
                                    fontFamily: 'monospace'
                                }}
                            >+₹{val.toLocaleString('en-IN')}</button>
                        ))}
                    </div>
                </div>

                {/* 3️⃣ The Grid (Simplified to 2 Key Metrics) */}
                <div style={{
                    padding: '24px 24px',
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'
                }}>
                    <InfoCard
                        label="Invested Capital"
                        icon={Wallet}
                        current={currentInvested}
                        projected={newInvested}
                        highlightColor="#4ade80" // Green for growth
                    />
                    <InfoCard
                        label="Monthly Return"
                        icon={TrendingUp}
                        current={currentMonthlyProfit}
                        projected={nextMonthProfit}
                        highlightColor="#3b82f6" // Blue for profit
                    />
                </div>

                {/* 4️⃣ Footer / Action Area */}
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    padding: '16px 32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div></div> {/* Spacer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={onClose}
                            style={{ padding: '12px 20px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReview}
                            disabled={!isValidAmount}
                            style={{
                                padding: '12px 32px', borderRadius: '12px',
                                background: amount > 0 ? '#21bc88ff' : '#334155',
                                border: 'none',
                                color: amount > 0 ? '#fff' : '#94a3b8',
                                fontWeight: '600', fontSize: '13px',
                                cursor: isValidAmount ? 'pointer' : 'not-allowed',
                                transition: 'all 0.3s'
                            }}
                        >
                            Review Request
                        </button>
                    </div>
                </div>

                {/* Confirmation Overlay */}
                {isConfirming && (
                    <div className="animate-fade-in"
                        onClick={(e) => { e.stopPropagation(); setIsConfirming(false); }}
                        style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(5, 7, 10, 0.9)', backdropFilter: 'blur(8px)',
                            zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}
                    >
                        <div className="animate-scale-in"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#131823', border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '100%',
                                textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{
                                width: '64px', height: '64px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto',
                                color: '#3b82f6'
                            }}>
                                <CheckCircle size={32} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>
                                Confirm Deposit
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                                Confirm deposit of <strong style={{ color: '#fff' }}>₹{amount.toLocaleString('en-IN')}</strong>?<br />
                                Your capital becomes <strong style={{ color: '#3b82f6' }}>₹{newInvested.toLocaleString('en-IN')}</strong> with <strong style={{ color: '#4ade80' }}>₹{Math.round(nextMonthProfit).toLocaleString('en-IN')}</strong> monthly profit.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setIsConfirming(false)}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        background: 'transparent', border: '1px solid rgba(148, 163, 184, 0.2)',
                                        color: '#cbd5e1', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px',
                                        background: '#3b82f6', border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.4s ease-out; }
                 @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>,
        document.body
    );
};

export default DepositRequestModal;