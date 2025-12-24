import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const UserIdBadge = ({ userId }) => {
    const [copiedId, setCopiedId] = useState(null);

    const handleCopyUserId = (e) => {
        e.stopPropagation();
        if (userId) {
            navigator.clipboard.writeText(userId);
            setCopiedId(userId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    return (
        <div
            onClick={handleCopyUserId}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                color: '#c4b5fd',
                background: 'linear-gradient(45deg, rgba(124, 58, 237, 0.1), rgba(139, 92, 246, 0.2))',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.1)',
                position: 'relative',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.25)';
                e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.color = '#ffffff';
                const icon = e.currentTarget.querySelector('.copy-icon');
                if (icon) icon.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(124, 58, 237, 0.1)';
                e.currentTarget.style.border = '1px solid rgba(139, 92, 246, 0.3)';
                e.currentTarget.style.color = '#c4b5fd';
                const icon = e.currentTarget.querySelector('.copy-icon');
                if (icon) icon.style.opacity = '0.5';
            }}
            title="Click to copy User ID"
        >
            {userId || '---'}
            {copiedId === userId ? (
                <Check size={14} style={{ color: '#4ade80', marginLeft: '4px' }} />
            ) : (
                <Copy className="copy-icon" size={12} style={{ opacity: 0.5, transition: 'opacity 0.2s', marginLeft: '4px' }} />
            )}
        </div>
    );
};

export default UserIdBadge;
