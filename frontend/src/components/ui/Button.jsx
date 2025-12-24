import React from 'react';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled,
    ...props
}) => {
    const variantClass = variant === 'primary' ? 'btn-primary' :
        variant === 'secondary' ? 'btn-secondary' :
            variant === 'ghost' ? 'btn-ghost' :
                variant === 'danger' ? 'btn-danger' : 'btn-primary';

    const sizeClass = size === 'sm' ? 'btn-sm' :
        size === 'lg' ? 'btn-lg' : '';

    return (
        <button
            className={`${variantClass} ${sizeClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <span className="loading-spinner" style={{ marginRight: '8px' }}></span>
            )}
            {children}
        </button>
    );
};

export default Button;
