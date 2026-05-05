import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hun_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Refresh token queue ────────────────────────────────────────────
let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token))
  failedQueue = []
}

function clearSession() {
  localStorage.removeItem('hun_token')
  localStorage.removeItem('hun_refresh_token')
  localStorage.removeItem('hun_user')
  if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login'
  }
}

// Handle 401 — try refresh before clearing session
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config

    if (err.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('hun_refresh_token')

      if (!refreshToken) {
        clearSession()
        return Promise.reject(err)
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
        const response = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
        const { token, refreshToken: newRefreshToken } = response.data
        localStorage.setItem('hun_token', token)
        localStorage.setItem('hun_refresh_token', newRefreshToken)
        api.defaults.headers.common.Authorization = `Bearer ${token}`
        processQueue(null, token)
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearSession()
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(err)
  }
)

// ── Public APIs ──────────────────────────────────────────
export const getAnnouncements    = () => api.get('/announcements')
export const getLocations        = () => api.get('/locations')
export const getProducts         = (params) => api.get('/products', { params })
export const getProduct          = (id) => api.get(`/products/${id}`)
export const getCategories       = () => api.get('/products/categories')
export const getCommissionTiers  = () => api.get('/products/commission-tiers')

export const submitConsignment = (data) => api.post('/consignments', data)
export const submitPurchase    = (data) => api.post('/purchases', data)
export const lookupSettlement  = (code) => api.get('/settlements/lookup', { params: { code } })

// ── Admin APIs ───────────────────────────────────────────
export const login          = (data) => api.post('/auth/login', data)
export const getMe          = () => api.get('/auth/me')
export const changePassword = (data) => api.post('/auth/change-password', data)

export const getDashboardStats    = () => api.get('/consignors/stats')
export const getDashboardReports  = (params) => api.get('/consignors/reports', { params })
export const getAdminProducts     = (params) => api.get('/products', { params })
export const uploadImage          = (formData) => api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const createProduct        = (data) => api.post('/products', data)
export const bulkCreateProducts   = (data) => api.post('/products/bulk', data)
export const updateProduct        = (id, data) => api.put(`/products/${id}`, data)
export const deleteProduct        = (id) => api.delete(`/products/${id}`)
export const returnProduct        = (id, reason) => api.patch(`/products/${id}/return`, { reason })
export const expireBatch          = () => api.post('/products/expire-batch')

// ── POS ──────────────────────────────────────────────────────────────────────
export const posSearch          = (q) => api.get('/pos/search', { params: { q, limit: 8 } })
export const posLookup          = (code) => api.get('/pos/product', { params: { code } })
export const posLookupCustomer  = (phone) => api.get('/pos/customer', { params: { phone } })
export const posGetCustomers    = (params) => api.get('/pos/customers', { params })
export const posGetCustomer     = (id) => api.get(`/pos/customers/${id}`)
export const posCreateSale      = (data) => api.post('/pos/sales', data)
export const posSales      = (params) => api.get('/pos/sales', { params })
export const posSale       = (id) => api.get(`/pos/sales/${id}`)
export const posMarkPaid   = (id, payment_reference) => api.patch(`/pos/sales/${id}/mark-paid`, { payment_reference })
export const posCancelSale = (id, cancel_reason)     => api.patch(`/pos/sales/${id}/cancel`, { cancel_reason })
export const posCreateReturn = (id, data)             => api.post(`/pos/sales/${id}/return`, data)
export const posGetReturns   = (id)                   => api.get(`/pos/sales/${id}/returns`)

export const getConsignors        = (params) => api.get('/consignors', { params })
export const getConsignor         = (id) => api.get(`/consignors/${id}`)
export const updateConsignor      = (id, data) => api.put(`/consignors/${id}`, data)

export const getConsignments      = (params) => api.get('/consignments', { params })
export const getConsignment       = (id) => api.get(`/consignments/${id}`)
export const updateConsignmentStatus = (id, data) => api.patch(`/consignments/${id}/status`, data)

export const getAdminSettlements  = (params) => api.get('/settlements', { params })
export const getSettlement        = (id) => api.get(`/settlements/${id}`)
export const createSettlement     = (data) => api.post('/settlements', data)
export const bulkCreateSettlements = (data) => api.post('/settlements/bulk', data)
export const markSettlementPaid     = (id, payment_notes) => api.patch(`/settlements/${id}/pay`, { payment_notes })
export const cancelSettlement       = (id) => api.patch(`/settlements/${id}/cancel`)
export const deleteSettlement       = (id) => api.delete(`/settlements/${id}`)

export const getPurchaseRequests  = (params) => api.get('/purchases', { params })
export const updatePurchaseStatus = (id, data) => api.patch(`/purchases/${id}/status`, data)

export const getAdminAnnouncements = () => api.get('/announcements/all')
export const createAnnouncement    = (data) => api.post('/announcements', data)
export const updateAnnouncement    = (id, data) => api.put(`/announcements/${id}`, data)
export const deleteAnnouncement    = (id) => api.delete(`/announcements/${id}`)

export const getAdminLocations     = () => api.get('/locations/all')
export const createLocation        = (data) => api.post('/locations', data)
export const updateLocation        = (id, data) => api.put(`/locations/${id}`, data)
export const deleteLocation        = (id) => api.delete(`/locations/${id}`)

// Email templates & expiring products
export const getEmailTemplates     = () => api.get('/email/templates')
export const createEmailTemplate   = (data) => api.post('/email/templates', data)
export const updateEmailTemplate   = (key, data) => api.put(`/email/templates/${key}`, data)
export const deleteEmailTemplate   = (key) => api.delete(`/email/templates/${key}`)
export const getExpiringProducts   = (days = 3) => api.get('/email/expiring', { params: { days } })
export const sendExpiringReminders = (data) => api.post('/email/send-expiring', data)

// Bank accounts
export const getBankAccounts   = () => api.get('/banks')
export const getActiveBank     = () => api.get('/banks/active')
export const createBankAccount = (data) => api.post('/banks', data)
export const updateBankAccount = (id, data) => api.put(`/banks/${id}`, data)
export const setActiveBank     = (id) => api.patch(`/banks/${id}/set-active`)
export const deleteBankAccount = (id) => api.delete(`/banks/${id}`)

// System settings (SMTP, CORS, etc.)
export const getSystemSettings  = () => api.get('/system-settings')
export const saveSystemSettings = (data) => api.patch('/system-settings', data)
export const testSmtp           = (to) => api.post('/system-settings/test-smtp', { to })
export const getPublicSettings  = () => api.get('/system-settings/public')
export const recalcCommissions   = (data) => api.post('/system-settings/recalculate-commissions', data)

// Reports — Excel export (returns blob)
export const exportFinancialReport = (params) =>
  api.get('/reports/export/financial', { params, responseType: 'blob' })
export const exportInventoryReport = (params) =>
  api.get('/reports/export/inventory', { params, responseType: 'blob' })

// AI features
export const suggestProduct    = (data) => api.post('/ai/suggest-product', data)
export const analyzeDashboard  = (data) => api.post('/ai/analyze-dashboard', data)

// Inbox — internal team chat
export const getInboxThreads      = ()         => api.get('/inbox/threads')
export const createInboxThread    = (data)     => api.post('/inbox/threads', data)
export const closeInboxThread     = (id)       => api.patch(`/inbox/threads/${id}/close`)
export const reopenInboxThread    = (id)       => api.patch(`/inbox/threads/${id}/reopen`)
export const deleteInboxThread    = (id)       => api.delete(`/inbox/threads/${id}`)
export const getInboxMessages     = (id, after) => api.get(`/inbox/threads/${id}/messages`, { params: after ? { after } : {} })
export const postInboxMessage     = (id, body) => api.post(`/inbox/threads/${id}/messages`, { body })
export const deleteInboxMessage   = (id)       => api.delete(`/inbox/messages/${id}`)

export default api
