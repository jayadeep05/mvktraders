import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Copy, Check } from 'lucide-react';
import { adminService } from '../services/api';

const PayoutModal = ({ show, onClose, onSuccess, userId, clientName, portfolio }) => {
    const [amount, setAmount] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [clientPortfolio, setClientPortfolio] = useState(null);
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [dateString, setDateString] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (show) {
            document.body.style.overflow = 'hidden';
            setAmount('');
            setScreenshot(null);
            setError('');
            // Fetch fresh portfolio and user details
            fetchClientDetails();
            const now = new Date();
            setDateString(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [show, userId]);

    // Close on ESC
    useEffect(() => {
        if (!show) return;
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [show, onClose]);

    useEffect(() => {
        if (clientPortfolio) {
            generateMessage(amount);
        }
    }, [amount, clientPortfolio]);

    const fetchClientDetails = async () => {
        setLoadingDetails(true);
        try {
            // If portfolio prop is provided (from ClientOverviewDashboard), use it directly
            if (portfolio) {
                // Map the portfolio structure to match expected format
                const mappedPortfolio = {
                    user: {
                        userId: portfolio.userId,
                        name: portfolio.clientName,
                        mobile: portfolio.mobile || 'N/A',
                        id: portfolio.clientId
                    },
                    availableProfit: portfolio.availableProfit,
                    totalInvested: portfolio.totalInvested,
                    profitPercentage: portfolio.profitPercentage || 0,
                    currentMonthProfit: portfolio.currentMonthProfit || 0
                };
                setClientPortfolio(mappedPortfolio);
            } else {
                // Fallback to API call for Admin
                const response = await adminService.getClientPortfolio(userId);
                // The API now returns a map { id, user: {...}, currentMonthProfit: 123, ... }
                // We need to map this flat-ish structure to what PayoutModal expects
                setClientPortfolio({
                    user: response.user,
                    availableProfit: response.availableProfit,
                    totalInvested: response.totalInvested,
                    totalValue: response.totalValue,
                    profitPercentage: response.profitPercentage,
                    currentMonthProfit: response.currentMonthProfit
                });
            }
        } catch (err) {
            console.error("Failed to load client details", err);
            setError("Could not load client details. Payout calculations might be inaccurate.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const generateMessage = (inputAmount) => {
        if (!clientPortfolio || !clientPortfolio.user) return;

        const payoutAmt = parseFloat(inputAmount) || 0;
        const user = clientPortfolio.user;

        const availableProfit = clientPortfolio.availableProfit || 0;
        const totalInvested = clientPortfolio.totalInvested || 0;
        const totalValue = clientPortfolio.totalValue || 0;
        const profitPercentage = clientPortfolio.profitPercentage || 0;
        const currentMonthProfit = clientPortfolio.currentMonthProfit || 0; // New field

        let newTotalInvested = totalInvested;
        let newAvailableProfit = availableProfit;
        let newTotalValue = totalValue;

        // Deduction Simulation
        if (availableProfit >= payoutAmt) {
            newAvailableProfit = availableProfit - payoutAmt;
        } else {
            const remainder = payoutAmt - availableProfit;
            newAvailableProfit = 0;
            newTotalInvested = totalInvested - remainder;
        }
        newTotalValue = newAvailableProfit + newTotalInvested;

        // Format Numbers
        const format = (num) => Math.floor(num).toLocaleString('en-IN');

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const formatDate = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
        const profitPeriod = `${formatDate(startOfMonth)} TO ${formatDate(endOfMonth)}`;

        const msg = `USER ID : ${user.userId || user.id}
CLIENT NAME : ${user.name}
MOBILE NUMBER : ${user.mobile || 'N/A'}

PREVIOUS INVESTMENT : ₹${format(totalInvested)}

MONTHLY RETURN RATE 📈 : ${profitPercentage}%

PAYOUT TRANSACTION ID : TXN_ID_PLACEHOLDER
-----------------------------------

PROFIT PAID FOR : ${profitPeriod}

Remaining Profit : ₹${format(newAvailableProfit)}
AMOUNT PAID : ₹${format(payoutAmt)}
DATE : ${dateString}

CURRENT INVESTMENT : ₹${format(newTotalInvested)}
FROM ${dateString} ONWARDS

Your future profits will be calculated based on the current active investment.`;

        setGeneratedMessage(msg);
    };

    const handleCopyMessage = () => {
        navigator.clipboard.writeText(generatedMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setScreenshot(e.target.files[0]);
        }
    };

    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
                setUserRole(role);
            } catch (e) {
                console.error("Error parsing token", e);
            }
        }
    }, [show]);

    const isMediator = userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const amountNum = parseFloat(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        // Admin Validation: Screenshot Required (optional for Mediators)
        if (!isMediator && !screenshot) {
            setError('Please upload a screenshot (proof of payment)');
            return;
        }

        setSubmitting(true);

        try {
            let response;
            if (isMediator) {
                // Mediator Flow: Submit Request
                const { mediatorService } = await import('../services/api');
                // Use userId (UUID) not formatted userIdString if possible, but API expects userId UUID
                // The prop 'userId' passed from Dashboard is actually 'clientId' (UUID)
                const note = document.querySelector('.note-area').value;
                response = await mediatorService.createPayoutRequest(userId, amountNum, note);
            } else {
                // Admin Flow: Direct Payout
                const formData = new FormData();
                formData.append('userId', userId);
                formData.append('amount', amountNum);
                formData.append('screenshot', screenshot);
                formData.append('message', generatedMessage);
                response = await adminService.payout(formData);
            }

            onSuccess && onSuccess(response?.transaction || response);
            onClose();
        } catch (err) {
            console.error('Error processing payout:', err);
            setError(err.response?.data?.message || 'Failed to process payout. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!show) return null;

    return createPortal(
        <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(5, 7, 10, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }} onClick={onClose}>
            <div style={{
                background: 'rgba(30, 41, 59, 1)', borderRadius: '24px',
                width: '100%', maxWidth: '850px', // Fixed decent max-width
                height: 'auto', maxHeight: '90vh', // Prevent cutoff
                border: '1px solid rgba(148, 163, 184, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                margin: '20px' // Safety margin for mobile
            }} onClick={(e) => e.stopPropagation()} className="modal-content-mobile">

                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: 0 }}>Record Payout</h2>
                        <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0' }}>Record payout for {clientName}</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
                </div>

                <style>{`
                    .payout-body {
                        display: flex;
                        flex: 1;
                        flex-wrap: wrap;
                        overflow-y: auto;
                    }
                    /* Desktop defaults */
                    .upload-area { padding: 20px; }
                    .note-area { min-height: 70px; }

                    @media (min-width: 800px) {
                        .payout-body {
                            overflow: hidden !important; 
                        }
                    }
                    /* Mobile Compact Overrides */
                    @media (max-width: 800px) {
                        .upload-area { padding: 12px !important; }
                        .note-area { min-height: 48px !important; }
                    }
                `}</style>
                <div className="payout-body">

                    {/* LEFT SECTION - INPUTS */}
                    <div style={{ flex: '1 1 350px', padding: '24px 32px', overflowY: 'auto' }}>
                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '20px' }}>
                                <style>{`
                                    /* Remove spinners */
                                    input[type=number]::-webkit-inner-spin-button, 
                                    input[type=number]::-webkit-outer-spin-button { 
                                        -webkit-appearance: none; 
                                        margin: 0; 
                                    }
                                    input[type=number] {
                                        -moz-appearance: textfield;
                                    }
                                `}</style>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payout Amount</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '18px' }}>₹</span>
                                    <input
                                        type="number" step="0.01" value={amount}
                                        onChange={(e) => { setAmount(e.target.value); setError(''); }}
                                        placeholder="0.00"
                                        style={{
                                            width: '100%', height: '52px', padding: '0 16px 0 40px', fontSize: '20px', fontWeight: '700',
                                            color: '#fff', background: 'rgba(15, 23, 42, 0.4)',
                                            border: error && !amount ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(148, 163, 184, 0.2)',
                                            borderRadius: '12px', outline: 'none', fontFamily: 'monospace'
                                        }}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    marginBottom: '20px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '16px 20px',
                                    background: 'rgba(15, 23, 42, 0.4)',
                                    border: error && !screenshot ? '1px dashed rgba(239, 68, 68, 0.5)' : '1px dashed rgba(148, 163, 184, 0.3)',
                                    borderRadius: '12px',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                                onClick={() => document.getElementById('screenshot-upload').click()}
                                onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = error && !screenshot ? 'rgba(239, 68, 68, 0.5)' : 'rgba(148, 163, 184, 0.3)'}
                            >
                                <label style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Payment Proof
                                </label>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 16px', borderRadius: '8px',
                                    background: screenshot ? 'rgba(52, 211, 153, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                    border: screenshot ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}>
                                    <input id="screenshot-upload" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                    {screenshot ? (
                                        <>
                                            <span style={{ color: '#34d399', fontSize: '12px', fontWeight: '600', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{screenshot.name}</span>
                                            <Check size={16} color="#34d399" />
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upload</span>
                                            <Upload size={16} color="#60a5fa" />
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Internal Note</label>
                                <textarea
                                    className="note-area"
                                    placeholder="Optional reference..."
                                    style={{
                                        width: '100%', padding: '12px', fontSize: '13px', color: '#f8fafc',
                                        background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(148, 163, 184, 0.2)',
                                        borderRadius: '12px', outline: 'none', resize: 'vertical'
                                    }}
                                />
                            </div>

                            {error && <div style={{ marginBottom: '16px', fontSize: '13px', color: '#fca5a5', background: 'rgba(127, 29, 29, 0.2)', padding: '8px 12px', borderRadius: '8px' }}>⚠️ {error}</div>}

                            <div style={{ marginTop: 'auto' }}>
                                <button type="submit" disabled={submitting || loadingDetails} style={{
                                    width: '100%', padding: '16px', background: submitting ? '#4f46e5' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                    border: 'none', borderRadius: '12px', color: '#ffffff', fontSize: '14px', fontWeight: '700',
                                    cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                }}>{submitting ? 'Processing...' : (isMediator ? 'Request Payout' : 'Confirm Payout')}</button>
                            </div>
                        </form>
                    </div>

                    {/* RIGHT SECTION - PREVIEW */}
                    <div style={{ flex: '1 1 350px', background: '#0f172a', padding: '24px', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: '1px solid rgba(148, 163, 184, 0.1)' }}>

                        <div style={{
                            background: '#1e293b', border: '1px solid rgba(51, 65, 85, 0.5)', borderRadius: '12px',
                            padding: '24px', fontFamily: '"JetBrains Mono", monospace', fontSize: '12px', lineHeight: '1.7', color: '#cbd5e1',
                            whiteSpace: 'pre-wrap', flex: 1, overflowY: 'auto', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                            position: 'relative' // For absolute positioning of copy button
                        }}>
                            <button onClick={handleCopyMessage} type="button" title={copied ? "Copied" : "Copy to clipboard"} style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                width: '32px', height: '32px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: copied ? 'rgba(52, 211, 153, 0.1)' : 'rgba(30, 41, 59, 0.8)',
                                border: '1px solid', borderColor: copied ? 'rgba(52, 211, 153, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                borderRadius: '8px',
                                color: copied ? '#34d399' : '#94a3b8',
                                cursor: 'pointer', transition: 'all 0.2s',
                                backdropFilter: 'blur(4px)',
                                zIndex: 10
                            }}>
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>

                            {loadingDetails ? (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ width: '20px', height: '20px', border: '2px solid #64748b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    <span>Generating Preview...</span>
                                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                                </div>
                            ) : (
                                generatedMessage || "Enter payout details to see the message preview..."
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >,
        document.body
    );
};

export default PayoutModal;
