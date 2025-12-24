import React from 'react';

const Input = ({
    label,
    error,
    icon,
    className = '',
    containerStyle = {},
    ...props
}) => {
    return (
        <div className="form-group" style={containerStyle}>
            {label && (
                <label className="form-label">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
                        {icon}
                    </div>
                )}
                <input
                    className={`glass-input ${icon ? 'pl-10' : ''} ${error ? 'error' : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && <p className="form-error">{error}</p>}
        </div>
    );
};

export default Input;
