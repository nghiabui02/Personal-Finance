import { apiFetch } from './client'
import type { SavingGoalStatus } from '@/lib/constants'

export type SavingGoal = {
  id: string
  user_id: string
  name: string
  icon: string | null
  target_amount: number
  current_amount: number
  deadline: string | null
  status: SavingGoalStatus
  note: string | null
}

export const savingGoalsApi = {
  create(payload: {
    name: string; icon?: string; target_amount: number; deadline?: string; note?: string
  }): Promise<SavingGoal> {
    return apiFetch('/api/saving-goals', { method: 'POST', body: JSON.stringify(payload) })
  },

  update(id: string, payload: Partial<{
    name: string; icon: string; target_amount: number; current_amount: number
    deadline: string; note: string; status: SavingGoal['status']
  }>): Promise<SavingGoal> {
    return apiFetch(`/api/saving-goals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
  },

  delete(id: string): Promise<null> {
    return apiFetch(`/api/saving-goals/${id}`, { method: 'DELETE' })
  },
}
