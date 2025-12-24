import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ClientDashboard from './pages/ClientDashboard';
import ClientOverviewDashboard from './pages/ClientOverviewDashboard';
import CreateUser from './pages/CreateUser';
import AdminTransactionApprovals from './pages/AdminTransactionApprovals';
import AdminPendingUsers from './pages/AdminPendingUsers';
import ProtectedLayout from './layouts/ProtectedLayout';
import BackgroundScene from './components/BackgroundScene';
import ProtectedRoute from './components/ProtectedRoute';

// Define roles constants for clarity
const ROLES = {
  ADMIN: ['ROLE_ADMIN', 'ADMIN'],
  CLIENT: ['ROLE_CLIENT', 'CLIENT'],
  MEDIATOR: ['ROLE_MEDIATOR', 'MEDIATOR'],
  ADMIN_OR_MEDIATOR: ['ROLE_ADMIN', 'ADMIN', 'ROLE_MEDIATOR', 'MEDIATOR']
};

function App() {
  return (
    <Router>
      <BackgroundScene />
      <Routes>
        {/* Public Route - Login Only */}
        <Route path="/login" element={<Login />} />

        {/* Client Route - No Sidebar */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={ROLES.CLIENT}>
            <ClientDashboard />
          </ProtectedRoute>
        } />

        {/* Protected Admin/Mediator Layout Routes */}
        <Route element={
          <ProtectedRoute allowedRoles={ROLES.ADMIN_OR_MEDIATOR}>
            <ProtectedLayout />
          </ProtectedRoute>
        }>

          {/* Shared Routes (Admin & Mediator) */}
          <Route path="/admin/clients" element={<ClientOverviewDashboard />} />
          <Route path="/admin/create-user" element={<CreateUser />} />
          <Route path="/admin/pending-users" element={<AdminPendingUsers />} />

          {/* Strict Admin Only Routes */}
          <Route path="/admin/transaction-approvals" element={
            <ProtectedRoute allowedRoles={ROLES.ADMIN}>
              <AdminTransactionApprovals />
            </ProtectedRoute>
          } />

        </Route>

        {/* Root Redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Catch all - redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
