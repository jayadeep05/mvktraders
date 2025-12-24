import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Wallet, TrendingUp, DollarSign, CalendarCheck, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { withdrawalService } from '../services/api';

const WithdrawalRequestModal = ({ show, onClose, portfolio, onSuccess, userId, isAdmin = false }) => {
    const [amountStr, setAmountStr] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // -------------------------------------------------------------------------
    // 🧠 Core Business Logic
    // -------------------------------------------------------------------------
    const totalInvested = portfolio?.totalInvested || 0;
    const availableProfit = portfolio?.availableProfit || 0;
    const totalBalance = totalInvested + availableProfit;
    const currentNextMonthProfit = totalInvested * 0.04;

    const amount = parseFloat(amountStr) || 0;
    const isValidAmount = amount > 0 && amount <= totalBalance;

    // Deduction Priority: Profit First
    const deductFromProfit = Math.min(amount, availableProfit);
    const deductFromCapital = Math.max(0, amount - availableProfit);

    // Future State Calculations
    const newProfit = Math.max(0, availableProfit - deductFromProfit);
    const newInvested = Math.max(0, totalInvested - deductFromCapital);
    const newTotalBalance = newInvested + newProfit;
    // Next Month Profit is based ONLY on Invested Capital
    const newNextMonthProfit = newInvested * 0.04;

    const isCapitalImpacted = deductFromCapital > 0;

    // -------------------------------------------------------------------------
    // 🔄 Lifecycle & Handlers
    // -------------------------------------------------------------------------
    // Fix: Store onClose in ref to avoid re-running effect when parent re-renders and passes new function
    const onCloseRef = React.useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
            setAmountStr('');
            setIsConfirming(false);
            setError('');

            // Push a new history state when modal opens to intercept back button
            window.history.pushState({ modalOpen: true }, '');

            const handlePopState = () => {
                // When back button is pressed, just close the modal
                if (onCloseRef.current) {
                    onCloseRef.current();
                }
            };

            window.addEventListener('popstate', handlePopState);

            return () => {
                window.removeEventListener('popstate', handlePopState);
                document.body.style.overflow = 'unset';
            };
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [show]);

    // Close on ESC
    // Close on ESC
    useEffect(() => {
        if (!show) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show]);

    const handleClose = () => {
        // If the modal is open and we have our state in history, go back to clear it
        // This triggers popstate, which calls onClose()
        if (show && window.history.state?.modalOpen) {
            window.history.back();
        } else {
            // Fallback if no history state (unlikely but safe)
            onClose();
        }
    };

    const handleReview = () => {
        if (!isValidAmount) return;
        if (amount > totalBalance) {
            setError('Insufficient balance');
            return;
        }
        setIsConfirming(true);
    };

    const handleConfirmSubmit = async () => {
        setSubmitting(true);
        try {
            let response;
            if (isAdmin && userId) {
                response = await withdrawalService.createRequestForUser(userId, amount);
            } else if (userId && (localStorage.getItem('token') && (JSON.parse(atob(localStorage.getItem('token').split('.')[1])).rol || []).includes('ROLE_MEDIATOR'))) {
                const { mediatorService } = await import('../services/api');
                response = await mediatorService.createWithdrawalRequest(userId, amount, `Withdrawal request initiated by Mediator`);
            } else {
                response = await withdrawalService.createRequest(amount);
            }

            if (response.success) {
                onSuccess && onSuccess(response.request);
                handleClose();
            } else {
                setError(response.message || 'Request failed');
                setIsConfirming(false);
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Request failed');
            setIsConfirming(false);
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    // -------------------------------------------------------------------------
    // 🎨 UI Components (Internal)
    // -------------------------------------------------------------------------
    const InfoCard = ({ label, current, projected, icon: Icon, isImpacted, highlightColor }) => {
        const hasChanged = Math.abs(current - projected) > 0.1 && amount > 0;
        const isOverBalance = amount > totalBalance;
        const activeColor = isOverBalance ? '#ef4444' : highlightColor;

        return (
            <div style={{
                background: 'rgba(30, 41, 59, 0.4)', // Very subtle slate
                borderRadius: '16px',
                padding: '17px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.3s ease',
                border: isOverBalance ? '1px solid rgba(239, 68, 68, 0.5)' : (hasChanged ? `1px solid ${activeColor}40` : '1px solid rgba(255,255,255,0.03)'),
                boxShadow: (!amount || amount <= 0)
                    ? '0 4px 20px rgba(8, 131, 53, 0.2)'
                    : (isOverBalance
                        ? '0 4px 20px rgba(239, 68, 68, 0.2)'
                        : (amount > availableProfit && hasChanged ? '0 4px 20px rgba(250, 204, 21, 0.1)' : '0 4px 20px rgba(0, 0, 0, 0.2)')),
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
                                ₹{Math.round(current).toLocaleString()}
                            </div>
                            {/* New Value (Large) */}
                            <div style={{ fontSize: '24px', fontWeight: '700', color: activeColor, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>
                                ₹{Math.round(projected).toLocaleString()}
                            </div>
                        </div>
                    ) : (
                        // Static Value
                        <div style={{ fontSize: '24px', fontWeight: '700', color: amount > 0 ? activeColor : '#f8fafc', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '18px' }}>
                            ₹{Math.round(current).toLocaleString()}
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
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }} onClick={handleClose}>
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
                margin: '16px' // Prevent edge touching
            }} onClick={e => e.stopPropagation()} className="animate-scale-in modal-content-mobile">

                {/* 1️⃣ Header Section */}
                <div style={{ padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '6px' }}>
                            Withdraw Funds
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '13px' }}>
                            Enter amount to see impact on your portfolio
                        </p>
                    </div>
                    <button onClick={handleClose} style={{ padding: '8px', borderRadius: '50%', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.target.style.background = 'transparent'}>
                        <X size={20} />
                    </button>
                </div>

                {/* 2️⃣ Main Input Section & Disclaimer */}
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
                                    minWidth: 0 // Allow shrinking
                                }}
                                autoFocus
                            />
                            <button
                                onClick={() => { setAmountStr(totalBalance.toString()); setError(''); }}
                                style={{
                                    marginLeft: '8px',
                                    color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)',
                                    border: 'none', padding: '6px 10px', borderRadius: '8px',
                                    fontSize: '11px', fontWeight: '700', cursor: 'pointer', letterSpacing: '0.5px',
                                    whiteSpace: 'nowrap'
                                }}>
                                MAX
                            </button>
                        </div>
                        {error && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '8px', marginLeft: '4px' }}>{error}</p>}
                    </div>

                    {/* Disclaimer Message - Full Width */}
                    <div style={{ width: '100%' }}>
                        {amount > 0 && (
                            <div className="animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: isCapitalImpacted ? 'rgba(239, 68, 68, 0.05)' : 'rgba(74, 222, 128, 0.05)', padding: '12px 16px', borderRadius: '12px', border: isCapitalImpacted ? '1px solid rgba(239, 68, 68, 0.1)' : '1px solid rgba(74, 222, 128, 0.1)' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: isCapitalImpacted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    {isCapitalImpacted ? <TrendingUp size={16} color="#ef4444" style={{ transform: 'rotate(180deg)' }} /> : <ShieldCheck size={16} color="#4ade80" />}
                                </div>
                                <div>
                                    <p style={{ color: isCapitalImpacted ? '#fca5a5' : '#86efac', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>
                                        {isCapitalImpacted ? "Capital Impact" : "Safe Withdrawal"}
                                    </p>
                                    <p style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.3' }}>
                                        {isCapitalImpacted
                                            ? "Reduces next month's profit."
                                            : "Capital remains 100% intact."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3️⃣ The Grid (Compact) */}
                <div style={{
                    padding: '24px 24px',
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'
                }}>
                    <InfoCard
                        label="Available Profit"
                        icon={DollarSign}
                        current={availableProfit}
                        projected={newProfit}
                        isImpacted={deductFromProfit > 0}
                        highlightColor={amount > availableProfit ? "#ef4444" : "#fbbf24"}
                    />
                    <InfoCard
                        label="Capital Invested"
                        icon={Wallet}
                        current={totalInvested}
                        projected={newInvested}
                        isImpacted={isCapitalImpacted}
                        highlightColor={isCapitalImpacted ? "#facc15" : "#4ade80"}
                    />
                    <InfoCard
                        label="Total Balance"
                        icon={TrendingUp}
                        current={totalBalance}
                        projected={newTotalBalance}
                        isImpacted={amount > 0}
                        highlightColor="#94a3b8"
                    />
                    <InfoCard
                        label="Next Month Profit"
                        icon={CalendarCheck}
                        current={currentNextMonthProfit}
                        projected={newNextMonthProfit}
                        isImpacted={isCapitalImpacted}
                        highlightColor={isCapitalImpacted ? "#facc15" : "#4ade80"}
                    />
                </div>

                {/* 4️⃣ Footer / Action Area */}
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    padding: '16px 32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>

                    {/* Empty Space for alignment */}
                    <div></div>

                    {/* Action Buttons (Right Side) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button
                            onClick={handleClose}
                            style={{ padding: '12px 20px', borderRadius: '12px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReview}
                            disabled={!isValidAmount}
                            style={{
                                padding: '12px 32px', borderRadius: '12px',
                                background: amount > 0 ? '#ef4444' : '#334155',
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

            </div>
            {/* Confirmation Overlay */}
            {isConfirming && (
                <div className="animate-fade-in"
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent closing the main modal
                        setIsConfirming(false); // Close overlay, go back to input
                    }}
                    style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(5, 7, 10, 0.9)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 20,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}
                >
                    <div className="animate-scale-in"
                        onClick={(e) => e.stopPropagation()} // Prevent backdrop click logic when clicking the card
                        style={{
                            background: '#131823',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '24px',
                            padding: '32px',
                            maxWidth: '420px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: '64px', height: '64px',
                            background: isCapitalImpacted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px auto',
                            color: isCapitalImpacted ? '#ef4444' : '#6366f1'
                        }}>
                            {isCapitalImpacted ? <AlertTriangle size={32} /> : <Info size={32} />}
                        </div>

                        <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#fff', marginBottom: '12px' }}>
                            {isCapitalImpacted ? 'Capital Reduction Warning' : 'Confirm Withdrawal'}
                        </h3>

                        <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                            {isCapitalImpacted ? (
                                <>
                                    You are about to withdraw <strong style={{ color: '#fff' }}>₹{amount.toLocaleString()}</strong>.
                                    This will reduce your invested capital. consequently, your estimated profit for next month will decrease to <strong style={{ color: '#ef4444' }}>₹{Math.round(newNextMonthProfit).toLocaleString()}</strong>.
                                </>
                            ) : (
                                <>
                                    You are about to withdraw <strong style={{ color: '#fff' }}>₹{amount.toLocaleString()}</strong> from your available profit. Your capital investment and future monthly returns will remain fully intact.
                                </>
                            )}
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
                                onClick={handleConfirmSubmit}
                                disabled={submitting}
                                style={{
                                    flex: 1, padding: '14px', borderRadius: '12px',
                                    background: isCapitalImpacted ? '#ef4444' : '#6366f1',
                                    border: 'none', color: '#fff', fontWeight: '600', cursor: 'pointer',
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                {submitting ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};

export default WithdrawalRequestModal;
