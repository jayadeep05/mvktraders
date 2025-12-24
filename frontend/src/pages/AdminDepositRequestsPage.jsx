import React from 'react';
import AdminDepositRequests from '../components/AdminDepositRequests';

const AdminDepositRequestsPage = () => {
    const [isReadOnly, setIsReadOnly] = React.useState(false);

    React.useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const role = payload.rol ? payload.rol[0] : (payload.roles ? payload.roles[0] : null);
            if (role === 'ROLE_MEDIATOR' || role === 'MEDIATOR') {
                setIsReadOnly(true);
            }
        }
    }, []);

    return (
        <div style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }} className="animate-fade-in">
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '8px',
                    letterSpacing: '-0.5px'
                }}>
                    Deposit Requests
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '15px' }}>
                    Review {isReadOnly ? '' : 'and approve'} client deposit requests
                </p>
            </div>

            <AdminDepositRequests readOnly={isReadOnly} />
        </div>
    );
};

export default AdminDepositRequestsPage;
