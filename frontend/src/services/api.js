import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 240_000,
  headers: { 'Content-Type': 'application/json' },
})

export const runOrchestration = async (request, aiMode = null, permissions = {}, subscriptions = [], userId = null) => {
  const payload = {
    request,
    user_id: userId || 'anonymous',
    agent_permissions: permissions,
    subscriptions: subscriptions.length > 0 ? subscriptions : undefined,
  }

  if (aiMode) {
    payload.ai_mode = aiMode
  }

  const { data } = await api.post('/orchestrate', payload)
  return data
}

export const getDashboardMetrics = async (userId = null) => {
  const { data } = await api.get('/dashboard/metrics', {
    params: userId ? { user_id: userId } : undefined,
  })
  return data
}

export const getExecutionHistory = async (limit = 5, userId = null) => {
  const { data } = await api.get('/dashboard/executions', {
    params: {
      limit,
      ...(userId ? { user_id: userId } : {}),
    },
  })
  return data
}

export const getHealth = async () => {
  const { data } = await axios.get('/health', { timeout: 5000 })
  return data
}

export const signUp = async ({ name, email, secret }) => {
  const { data } = await api.post('/auth/signup', { name, email, secret })
  return data.user
}

export const signIn = async ({ email, secret }) => {
  const { data } = await api.post('/auth/signin', { email, secret })
  return data.user
}

export const getUserSubscriptions = async (userId) => {
  const { data } = await api.get(`/auth/subscriptions/${userId}`)
  return data.subscriptions || []
}

export const saveUserSubscriptions = async (userId, subscriptions) => {
  const { data } = await api.put(`/auth/subscriptions/${userId}`, { subscriptions })
  return data
}
