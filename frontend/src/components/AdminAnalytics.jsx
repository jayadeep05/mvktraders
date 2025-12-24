import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const AdminAnalytics = ({ users }) => {

    // Aggregate data from users
    const totalSystemInvested = users.reduce((acc, u) => acc + (u.totalInvested || 0), 0);
    const totalSystemWithdrawn = users.reduce((acc, u) => acc + (u.totalWithdrawn || 0), 0);
    const totalSystemProfit = users.reduce((acc, u) => acc + (u.totalProfit || 0), 0);
    const totalSystemBalance = users.reduce((acc, u) => acc + (u.currentBalance || 0), 0);

    const pieData = [
        { name: 'Invested', value: totalSystemInvested },
        { name: 'Withdrawn', value: totalSystemWithdrawn }
    ];

    const profitDistribution = users.map(u => ({
        name: u.name,
        profit: u.totalProfit || 0
    })).sort((a, b) => b.profit - a.profit).slice(0, 10); // Top 10 users by profit

    const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#f472b6'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>System Balance</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0' }}>${totalSystemBalance.toLocaleString()}</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Profit Paid</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--success)' }}>${totalSystemProfit.toLocaleString()}</p>
                </div>
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Invested</h4>
                    <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '0.5rem 0', color: 'var(--accent-primary)' }}>${totalSystemInvested.toLocaleString()}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

                {/* Top Profitable Clients */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Top Clients by Profit</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={profitDistribution} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                            <XAxis type="number" stroke="var(--text-secondary)" />
                            <YAxis dataKey="name" type="category" width={100} stroke="var(--text-secondary)" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Bar dataKey="profit" fill="var(--success)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Investment Ratio */}
                <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>System Investment Ratio</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ textAlign: 'center', marginTop: '-20px', color: 'var(--text-secondary)' }}>
                        Invested vs Withdrawn
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAnalytics;
