import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext.jsx';
import Layout from './components/Layout/Layout.jsx';
import DashboardPage from './components/Dashboard/DashboardPage.jsx';
import ConnectionPage from './components/Connection/ConnectionPage.jsx';
import TemplateList from './components/Templates/TemplateList.jsx';
import TemplateForm from './components/Templates/TemplateForm.jsx';
import ConfigPage from './components/Config/ConfigPage.jsx';
import ConfigLogin from './components/Config/ConfigLogin.jsx';
import HistoryPage from './components/History/HistoryPage.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/conectar" element={<ConnectionPage />} />
          <Route path="/templates" element={<TemplateList />} />
          <Route path="/templates/novo" element={<TemplateForm />} />
          <Route path="/templates/:id/editar" element={<TemplateForm />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/config-login" element={<ConfigLogin />} />
          <Route path="/historico" element={<HistoryPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
