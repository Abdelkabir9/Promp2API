import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Functions from './pages/Functions';
import FunctionBuilder from './pages/FunctionBuilder';
import Models from './pages/Models';
import ModelBuilder from './pages/ModelBuilder';
import APIs from './pages/APIs';
import APIDetails from './pages/APIDetails';
import ExternalAPIs from './pages/ExternalAPIs';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="h-screen w-full flex items-center justify-center font-bold text-slate-400">Verifying session...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                
                <Route path="/functions" element={<Functions />} />
                <Route path="/functions/new" element={<FunctionBuilder />} />
                <Route path="/functions/:id" element={<FunctionBuilder />} />
                
                <Route path="/models" element={<Models />} />
                <Route path="/models/new" element={<ModelBuilder />} />
                <Route path="/models/:id" element={<ModelBuilder />} />

                <Route path="/external-apis" element={<ExternalAPIs />} />
                
                <Route path="/apis" element={<APIs />} />
                <Route path="/apis/:id" element={<APIDetails />} />
                
                <Route path="/settings" element={<Settings />} />
                
                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;