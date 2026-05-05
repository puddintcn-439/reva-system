import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../context/AuthContext'

// ── Mock api.js ──────────────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
}))

// ── Mock axios for logout call ───────────────────────────────────────────────
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({}),
    defaults: { headers: { common: {} } },
  },
}))

import { getMe, login as apiLogin } from '../services/api'

// Helper: renders a component inside AuthProvider and captures context
function TestConsumer() {
  const { user, loading, can, logout } = useAuth()
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="user">{user ? user.username : 'none'}</span>
      <span data-testid="can-pos">{can('pos:sale') ? 'yes' : 'no'}</span>
      <button onClick={logout} data-testid="logout">logout</button>
    </div>
  )
}

function LoginConsumer() {
  const { login } = useAuth()
  return (
    <button
      data-testid="login-btn"
      onClick={() => login({ username: 'admin', password: 'x' })}
    >
      login
    </button>
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  test('shows loading then ready when no token', async () => {
    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  test('loads user from getMe when token exists', async () => {
    localStorage.setItem('hun_token', 'fake-jwt')
    getMe.mockResolvedValueOnce({ data: { user: { username: 'admin', permissions: ['pos:sale'] } } })

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('admin'))
    expect(screen.getByTestId('can-pos').textContent).toBe('yes')
  })

  test('clears token when getMe fails', async () => {
    localStorage.setItem('hun_token', 'bad-jwt')
    getMe.mockRejectedValueOnce(new Error('401'))

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('ready'))
    expect(localStorage.getItem('hun_token')).toBeNull()
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  test('login stores token and refreshToken, updates user', async () => {
    apiLogin.mockResolvedValueOnce({
      data: {
        token: 'new-jwt',
        refreshToken: 'refresh-abc',
        user: { username: 'admin', permissions: [] },
      },
    })

    render(<AuthProvider><LoginConsumer /></AuthProvider>)
    await act(async () => {
      await userEvent.click(screen.getByTestId('login-btn'))
    })

    expect(localStorage.getItem('hun_token')).toBe('new-jwt')
    expect(localStorage.getItem('hun_refresh_token')).toBe('refresh-abc')
  })

  test('logout clears tokens and calls logout endpoint', async () => {
    localStorage.setItem('hun_token', 'jwt')
    localStorage.setItem('hun_refresh_token', 'refresh-token')
    getMe.mockResolvedValueOnce({ data: { user: { username: 'admin', permissions: [] } } })

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('admin'))

    await act(async () => {
      await userEvent.click(screen.getByTestId('logout'))
    })

    expect(localStorage.getItem('hun_token')).toBeNull()
    expect(localStorage.getItem('hun_refresh_token')).toBeNull()
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  test('can() returns false for missing permissions', async () => {
    localStorage.setItem('hun_token', 'jwt')
    getMe.mockResolvedValueOnce({ data: { user: { username: 'staff', permissions: ['products:view'] } } })

    render(<AuthProvider><TestConsumer /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('can-pos').textContent).toBe('no'))
  })
})
