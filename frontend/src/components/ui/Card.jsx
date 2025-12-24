import React from 'react';

const Card = ({ children, className = '', hover = false, ...props }) => {
    return (
        <div
            className={`glass-panel ${hover ? 'hover-lift' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
