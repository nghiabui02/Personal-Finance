import { apiFetch } from './client'

export const settingsApi = {
  updateProfile(payload: { full_name?: string; phone?: string; avatar_url?: string }): Promise<unknown> {
    return apiFetch('/api/settings/profile', { method: 'PATCH', body: JSON.stringify(payload) })
  },

  updateEmail(email: string): Promise<{ message: string }> {
    return apiFetch('/api/settings/email', { method: 'PATCH', body: JSON.stringify({ email }) })
  },

  updatePassword(payload: {
    currentPassword: string
    password: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    return apiFetch('/api/settings/password', { method: 'PATCH', body: JSON.stringify(payload) })
  },
}
