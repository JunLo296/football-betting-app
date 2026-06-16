import axios from 'axios'

// Axios instance with base configuration
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API service with all endpoints
export const apiService = {
  // Auth endpoints
  auth: {
    login: (username, password) => api.post('/auth/login', { username, password }),
    getCurrentUser: () => api.get('/auth/me'),
  },

  // Match endpoints
  matches: {
    getAll: (params = {}) => api.get('/matches', { params }),
    getById: (id) => api.get(`/matches/${id}`),
  },

  // Bet endpoints
  bets: {
    placeBet: (matchId, outcome, coinsBet) =>
      api.post('/bets', { match_id: matchId, outcome, coins_bet: coinsBet }),
    getMyBets: () => api.get('/bets/my-bets'),
    getMatchBets: (matchId) => api.get(`/bets/match/${matchId}`),
  },

  // Leaderboard endpoint
  leaderboard: {
    get: () => api.get('/leaderboard'),
  },

  // Admin endpoints
  admin: {
    createMatch: (matchData) => api.post('/admin/matches', matchData),
    updateOdds: (matchId, odds) => api.patch(`/admin/matches/${matchId}/odds`, odds),
    confirmResult: (matchId, result) =>
      api.post(`/admin/matches/${matchId}/confirm-result`, result),
    getUsers: () => api.get('/admin/users'),
    grantCoins: (userId, amount, reason) =>
      api.post(`/admin/users/${userId}/grant-coins`, { amount, reason }),
  },
}

export default api
