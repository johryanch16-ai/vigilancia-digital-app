import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppClient from './AppClient';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminLogin from './admin/AdminLogin';
import AdminZones from './admin/AdminZones';
import AdminCategories from './admin/AdminCategories';
import AdminSettings from './admin/AdminSettings';
import AdminEquipos from './admin/AdminEquipos';
import AdminBitacora from './admin/AdminBitacora';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppClient />} />
        
        <Route path="/acceso-privado-vd" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/tickets" replace />} />
          <Route path="tickets" element={<AdminDashboard />} />
          <Route path="equipos" element={<AdminEquipos />} />
          <Route path="zones" element={<AdminZones />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="bitacora" element={<AdminBitacora />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
