// frontend/src/utils/permissions.js
// Utilidades para manejo de permisos por rol

export const ROLES = {
  ADMIN: 'admin',
  GESTOR_PMO: 'gestor_pmo',
  CONSULTA: 'consulta',
}

// Verificar si el usuario tiene uno de los roles especificados
export const hasRole = (user, roles) => {
  if (!user || !user.role) return false
  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  return allowedRoles.includes(user.role)
}

// Permisos específicos por funcionalidad
export const can = {
  // Dashboard
  viewDashboard: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO, ROLES.CONSULTA]),

  // Proyectos
  viewProjects: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO, ROLES.CONSULTA]),
  createProject: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO]),
  editProject: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO]),
  disableProject: (user) => hasRole(user, [ROLES.ADMIN]),

  // Modificaciones
  createModification: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO]),
  editModification: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO]),

  // Documentos
  viewDocuments: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO, ROLES.CONSULTA]),
  addDocument: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO]),
  deleteDocument: (user) => hasRole(user, [ROLES.ADMIN]),

  // Catálogos
  viewCatalogs: (user) => hasRole(user, [ROLES.ADMIN]),
  editCatalogs: (user) => hasRole(user, [ROLES.ADMIN]),

  // Reportes
  downloadExcel: (user) => hasRole(user, [ROLES.ADMIN, ROLES.GESTOR_PMO, ROLES.CONSULTA]),
  useAIAssistant: (user) => hasRole(user, [ROLES.ADMIN]),
  useDerechoPeticion: (user) => hasRole(user, [ROLES.ADMIN]),
}