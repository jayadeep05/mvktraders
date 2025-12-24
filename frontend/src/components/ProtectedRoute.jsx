import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUserRole } from '../utils/auth';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();
    const isAuth = isAuthenticated();
    const userRole = getUserRole();

    // 1. Check Authentication
    if (!isAuth) {
        // Redirect to login, preserving where they were trying to go
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. Check Role Authorization (if specific roles are required)
    if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.includes(userRole);

        if (!hasPermission) {
            // User is logged in but doesn't have permission for this route.
            // Redirect to their appropriate dashboard to prevent unauthorized access.

            console.warn(`Access denied to ${location.pathname} for role: ${userRole}`);

            if (userRole === 'ROLE_ADMIN' || userRole === 'ADMIN') {
                return <Navigate to="/admin/clients" replace />;
            } else if (userRole === 'ROLE_CLIENT' || userRole === 'CLIENT') {
                return <Navigate to="/dashboard" replace />;
            } else if (userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') {
                // Mediators share the client overview view currently
                return <Navigate to="/admin/clients" replace />;
            } else {
                // Unknown role or invalid state, force to login
                return <Navigate to="/login" replace />;
            }
        }
    }

    // 3. Render Protected Content
    return children;
};

export default ProtectedRoute;
