import React, { useEffect, useState } from 'react';
import { adminService } from '../services/api';
import ProfitManagementModal from './ProfitManagementModal';

const AdminUserList = ({ users, onRefresh }) => {
    const [selectedUserForProfit, setSelectedUserForProfit] = useState(null);

    if (!users || users.length === 0) {
        return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No active clients found.</div>;
    }

    return (
        <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', overflowX: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Client Financial Overview</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <th style={{ padding: '1rem', fontWeight: '500' }}>Client Name</th>
                        <th style={{ padding: '1rem', fontWeight: '500' }}>Email</th>
                        <th style={{ padding: '1rem', fontWeight: '500' }}>Bank Info</th>
                        <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Invested</th>
                        <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Withdrawn</th>
                        <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Total Profit</th>
                        <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Balance</th>
                        <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'center' }}>Profit Config</th>
                        <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'center' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.clientId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                            <td style={{ padding: '1rem' }}>{user.clientName}</td>
                            <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                            <td style={{ padding: '1rem' }}>
                                <div style={{ fontSize: '0.9rem' }}>{user.bankName || 'N/A'}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user.accountNumber || '-'}</div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--accent-primary)' }}>
                                ${user.totalInvested?.toLocaleString() ?? 0}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--danger)' }}>
                                ${user.totalWithdrawn?.toLocaleString() ?? 0}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--success)' }}>
                                +${user.profitOrLoss?.toLocaleString() ?? 0}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold' }}>
                                ${user.currentValue?.toLocaleString() ?? 0}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.9rem' }}>{user.profitPercentage ? `${user.profitPercentage}%` : '-'}</div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: user.profitStatus === 'ACTIVE' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                                    color: user.profitStatus === 'ACTIVE' ? '#4ade80' : '#94a3b8',
                                    display: 'inline-block',
                                    marginTop: '4px'
                                }}>
                                    {user.profitStatus || 'PAUSED'}
                                </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                                <button
                                    onClick={() => setSelectedUserForProfit(user)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        borderRadius: '6px',
                                        color: '#818cf8',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.2)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.1)'}
                                >
                                    Manage
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {selectedUserForProfit && (
                <ProfitManagementModal
                    show={!!selectedUserForProfit}
                    user={selectedUserForProfit}
                    onClose={() => setSelectedUserForProfit(null)}
                    onUpdate={() => {
                        if (onRefresh) onRefresh();
                    }}
                />
            )}
        </div>
    );
};

export default AdminUserList;
