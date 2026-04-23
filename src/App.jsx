import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute, AdminRoute } from './components/layout/RouteGuards';
import AppLayout from './components/layout/AppLayout';
import LoginPage    from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SensorsPage  from './pages/SensorsPage';
import AlertsPage   from './pages/AlertsPage';
import AdminPage    from './pages/AdminPage';
import LogsPage     from './pages/LogsPage';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected routes — any logged-in user */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sensors"   element={<SensorsPage />} />
              <Route path="/alerts"    element={<AlertsPage />} />

              {/* Admin-only routes */}
              <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
              <Route path="/logs"  element={<AdminRoute><LogsPage /></AdminRoute>} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
