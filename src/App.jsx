import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppClient from './AppClient';
import Login from './Login';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminZones from './admin/AdminZones';
import AdminCategories from './admin/AdminCategories';
import AdminSettings from './admin/AdminSettings';
import AdminEquipos from './admin/AdminEquipos';
import AdminBitacora from './admin/AdminBitacora';
import AdminUsers from './admin/AdminUsers';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/cliente" element={<AppClient />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/tickets" replace />} />
          <Route path="tickets" element={<AdminDashboard />} />
          <Route path="equipos" element={<AdminEquipos />} />
          <Route path="zones" element={<AdminZones />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="bitacora" element={<AdminBitacora />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
