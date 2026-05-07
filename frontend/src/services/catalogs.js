import api from './api'

// ── Auth ──────────────────────────────────────────────────────────────
export const authService = {
  login: (username, password) => {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
  register: (data) => api.post('/auth/register', data),
}

// ── Catálogos CRUD genérico ───────────────────────────────────────────
const crud = (prefix) => ({
  list:   (activeOnly = false) => api.get(`${prefix}/?active_only=${activeOnly}`),
  create: (data)               => api.post(`${prefix}/`, data),
  update: (id, data)           => api.put(`${prefix}/${id}`, data),
  toggle: (id)                 => api.patch(`${prefix}/${id}/toggle`),
})

export const entityTypesService          = crud('/entity-types')
export const entitiesService             = crud('/entities')
export const executingDepartmentsService = crud('/executing-departments')
export const executionModalitiesService  = crud('/execution-modalities')
export const financingTypesService       = crud('/financing-types')
export const orderingOfficialsService    = crud('/ordering-officials')
export const projectStatusesService      = crud('/project-statuses')
export const documentTypesService        = crud('/document-types')
