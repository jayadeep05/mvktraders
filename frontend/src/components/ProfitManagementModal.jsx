import React, { useEffect, useState } from 'react';
import { profitService } from '../services/api';

const ProfitManagementModal = ({ show, onClose, user, onUpdate }) => {
    const [activeTab, setActiveTab] = useState('settings');
    const [percentage, setPercentage] = useState('');
    const [status, setStatus] = useState('PAUSED');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (show && user) {
            setPercentage(user.profitPercentage || 0);
            setStatus(user.profitStatus || 'PAUSED');
            fetchHistory();
        }
    }, [show, user]);

    const fetchHistory = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await profitService.getHistory(user.clientId);
            setHistory(data);
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');
        try {
            await profitService.updateConfig(user.clientId, {
                profitPercentage: parseFloat(percentage),
                status
            });
            setMessage('Configuration saved successfully');
            if (onUpdate) onUpdate();
        } catch (error) {
            setMessage('Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleCalculate = async () => {
        setSaving(true);
        setMessage('');
        const now = new Date();
        try {
            await profitService.calculateForUser(user.clientId, now.getMonth() + 1, now.getFullYear());
            setMessage('Profit calculated successfully');
            fetchHistory();
            if (onUpdate) onUpdate();
        } catch (error) {
            setMessage('Failed to calculate profit: ' + (error.response?.data?.message || 'Error'));
        } finally {
            setSaving(false);
        }
    };

    if (!show || !user) return null;

    const tabStyle = (isActive) => ({
        padding: '0.75rem 1.5rem',
        borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
        color: isActive ? '#fff' : '#94a3b8',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s'
    });

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }} onClick={onClose} className="animate-fade-in">
            <div style={{
                background: 'rgba(30, 41, 59, 1)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                padding: '32px',
                width: '600px',
                maxWidth: '90%',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} onClick={(e) => e.stopPropagation()} className="animate-scale-in">

                <h2 style={{ fontSize: '1.5rem', color: 'white', marginBottom: '0.5rem' }}>
                    Profit Management: {user.clientName}
                </h2>
                <div style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={tabStyle(activeTab === 'settings')} onClick={() => setActiveTab('settings')}>Settings</div>
                    <div style={tabStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>History</div>
                </div>

                {activeTab === 'settings' && (
                    <form onSubmit={handleSaveConfig}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Monthly Profit Percentage (%)</label>
                            <input
                                type="number" step="0.01"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: 'white' }}
                            />
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: '#cbd5e1', marginBottom: '0.5rem' }}>Accrual Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: 'white' }}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="PAUSED">PAUSED</option>
                            </select>
                        </div>

                        {message && <div style={{ marginBottom: '1rem', color: message.includes('Success') ? '#4ade80' : '#f87171' }}>{message}</div>}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={handleCalculate}
                                disabled={saving}
                                style={{ padding: '0.75rem 1.5rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#4ade80', borderRadius: '8px', cursor: 'pointer' }}
                            >
                                Trigger Profit Now (Current Month)
                            </button>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                                <button type="submit" disabled={saving} style={{ padding: '0.75rem 1.5rem', background: '#6366f1', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Config'}</button>
                            </div>
                        </div>
                    </form>
                )}

                {activeTab === 'history' && (
                    <div>
                        {loading ? <div style={{ color: '#94a3b8' }}>Loading history...</div> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e2e8f0', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem' }}>Month/Year</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Opening</th>
                                        <th style={{ padding: '0.75rem' }}>%</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Profit</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Closing</th>
                                        <th style={{ padding: '0.75rem' }}>Source</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.length === 0 ? (
                                        <tr><td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>No profit history found.</td></tr>
                                    ) : (
                                        history.map(h => (
                                            <tr key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <td style={{ padding: '0.75rem' }}>{h.month}/{h.year}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>${h.openingBalance.toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem' }}>{h.profitPercentage}%</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', color: '#4ade80' }}>+${h.profitAmount.toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right' }}>${h.closingBalance.toLocaleString()}</td>
                                                <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>{h.manual ? 'Manual' : 'System'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfitManagementModal;
