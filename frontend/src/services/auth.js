import api from './api'

// Auth service functions - will be implemented in Task 14
export const authService = {
  async login(username, password) {
    const response = await api.post('/auth/login', { username, password })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    return response.data
  },

  async logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me')
    return response.data
  },

  getToken() {
    return localStorage.getItem('token')
  },

  getUser() {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  isAuthenticated() {
    return !!this.getToken()
  }
}
