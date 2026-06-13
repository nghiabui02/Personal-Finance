import { apiFetch } from './client'

export const authApi = {
  signIn(payload: { email: string; password: string }): Promise<{ success: true }> {
    return apiFetch('/api/auth/sign-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  signUp(payload: { email: string; password: string }): Promise<{ message: string }> {
    return apiFetch('/api/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  signOut(): Promise<{ success: true }> {
    return apiFetch('/api/auth/sign-out', { method: 'POST' })
  },
}
