// frontend/src/App.jsx — v4.4
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectFormPage from './pages/projects/ProjectFormPage'
import ProjectViewPage from './pages/projects/ProjectViewPage'
import ProjectModificationsPage from './pages/projects/ProjectModificationsPage'
import ProjectDocumentsPage from './pages/projects/ProjectDocumentsPage'
import EntitiesPage from './pages/catalogs/EntitiesPage'
import EntityTypesPage from './pages/catalogs/EntityTypesPage'
import ExecutingDepartmentsPage from './pages/catalogs/ExecutingDepartmentsPage'
import ExecutionModalitiesPage from './pages/catalogs/ExecutionModalitiesPage'
import FinancingTypesPage from './pages/catalogs/FinancingTypesPage'
import OrderingOfficialsPage from './pages/catalogs/OrderingOfficialsPage'
import ProjectStatusesPage from './pages/catalogs/ProjectStatusesPage'
import DocumentTypesPage from './pages/catalogs/DocumentTypesPage'
import ReportesPage from './pages/ReportesPage'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          containerStyle={{ zIndex: 999999 }}
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#B91C3C', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Pantalla completa (sin AppLayout) */}
          <Route path="/projects/new"               element={<ProjectFormPage />} />
          <Route path="/projects/:id/edit"          element={<ProjectFormPage />} />
          <Route path="/projects/:id/view"          element={<ProjectViewPage />} />
          <Route path="/projects/:id/modifications" element={<ProjectModificationsPage />} />
          <Route path="/projects/:id/documents"     element={<ProjectDocumentsPage />} />

          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects"  element={<ProjectsPage />} />
            <Route path="/reportes"  element={<ReportesPage />} />

            <Route path="/catalogs/entities"       element={<EntitiesPage />} />
            <Route path="/catalogs/entity-types"   element={<EntityTypesPage />} />
            <Route path="/catalogs/departments"    element={<ExecutingDepartmentsPage />} />
            <Route path="/catalogs/modalities"     element={<ExecutionModalitiesPage />} />
            <Route path="/catalogs/financing"      element={<FinancingTypesPage />} />
            <Route path="/catalogs/officials"      element={<OrderingOfficialsPage />} />
            <Route path="/catalogs/statuses"       element={<ProjectStatusesPage />} />
            <Route path="/catalogs/document-types" element={<DocumentTypesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
