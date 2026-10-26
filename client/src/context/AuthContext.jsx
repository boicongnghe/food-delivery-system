import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/authApi.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('currentUser')
      return savedUser ? JSON.parse(savedUser) : {
        _id: '6ad719c9f02e3385602cfd09',
        fullName: 'Nguyễn Văn Đạt (Khách hàng)',
        email: 'customer@demo.com',
        role: 'customer',
      }
    } catch {
      return null
    }
  })

  const [loading, setLoading] = useState(false)

  // Login handler
  const login = async (email, password) => {
    try {
      setLoading(true)
      const res = await authApi.login({ email, password })
      const { user: userData, token } = res.data.data
      localStorage.setItem('token', token)
      localStorage.setItem('currentUser', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Đăng nhập thất bại',
      }
    } finally {
      setLoading(false)
    }
  }

  // Quick Switch for Demo / Testing (Customer vs Admin)
  const quickSwitchRole = async (targetRole) => {
    const targetEmail = targetRole === 'admin' ? 'admin@demo.com' : 'customer@demo.com'
    const result = await login(targetEmail, 'password123')
    return result
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    setUser(null)
  }

  const isCustomer = user?.role === 'customer'
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        quickSwitchRole,
        logout,
        isCustomer,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
