import api from './api'

export const modificationsService = {
  list:   (projectId)              => api.get(`/projects/${projectId}/modifications/`),
  get:    (modId)                  => api.get(`/modifications/${modId}`),
  create: (projectId, data)        => api.post(`/projects/${projectId}/modifications/`, data),
  update: (modId, data)            => api.put(`/modifications/${modId}`, data),
  toggle: (modId)                  => api.patch(`/modifications/${modId}/toggle`),
}
