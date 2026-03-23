// Mise à jour du routage - Version 1.0
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './Pages/LandingPage';
import Dashboard from './Pages/Dashboard';
import ProspectForm from './Pages/ProspectForm';
import ProspectDetail from './Pages/ProspectDetail';
import ClientPortal from './Pages/ClientPortal';
import Conformite from './Pages/Conformite';
import { useStore } from './store';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen bg-[#121417] text-[#F8F9FA]">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/prospects/new" 
            element={
              <PrivateRoute>
                <ProspectForm />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/prospects/:id" 
            element={
              <PrivateRoute>
                <ProspectDetail />
              </PrivateRoute>
            } 
          />
          <Route path="/client" element={<ClientPortal />} />
          <Route path="/conformite" element={<PrivateRoute><Conformite /></PrivateRoute>} />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default App;
