import api from './api'

// Auth service with full authentication flow
export const authService = {
  /**
   * Login user and store token and user data
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} User data and token
   */
  async login(username, password) {
    try {
      const response = await api.post('/auth/login', { username, password })
      if (response.data.token) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
      return response.data
    } catch (error) {
      // Extract error message from response
      const message = error.response?.data?.error || 'Login failed. Please try again.'
      throw new Error(message)
    }
  },

  /**
   * Logout user and clear stored data
   */
  async logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  /**
   * Get current user from API
   * @returns {Promise<Object>} Current user data
   */
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me')
      // Update stored user data
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data))
      }
      return response.data
    } catch (error) {
      // If user fetch fails, clear stored data
      this.logout()
      throw error
    }
  },

  /**
   * Get stored token
   * @returns {string|null} JWT token
   */
  getToken() {
    return localStorage.getItem('token')
  },

  /**
   * Get stored user data
   * @returns {Object|null} User object
   */
  getUser() {
    const user = localStorage.getItem('user')
    return user ? JSON.parse(user) : null
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} True if token exists
   */
  isAuthenticated() {
    return !!this.getToken()
  },

  /**
   * Check if current user is admin
   * @returns {boolean} True if user is admin
   */
  isAdmin() {
    const user = this.getUser()
    return user?.is_admin || false
  },

  /**
   * Refresh user data from API
   * @returns {Promise<Object>} Updated user data
   */
  async refreshUser() {
    return await this.getCurrentUser()
  }
}
