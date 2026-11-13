import { useEffect, useState } from 'react'
import authApi from '../api/authApi.js'
import { AuthContext } from './authContext.js'
import { connectSocket, disconnectSocket } from '../services/socket.js'

const getStoredToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
const clearStoredAuth = () => {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  try {
    sessionStorage.removeItem('foodbot_chat_history')
    sessionStorage.removeItem('foodbot_chat_history_guest')
  } catch {}
}
const persistToken = (receivedToken, rememberMe = true) => {
  if (rememberMe) {
    localStorage.setItem('token', receivedToken)
    sessionStorage.removeItem('token')
  } else {
    sessionStorage.setItem('token', receivedToken)
    localStorage.removeItem('token')
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(null)

  const [loading, setLoading] = useState(() => Boolean(getStoredToken()))

  useEffect(() => {
    const savedToken = getStoredToken()
    if (!savedToken) {
      return
    }

    let isMounted = true

    authApi
      .getMe()
      .then((response) => {
        if (isMounted && response?.data) {
          setUser(response.data)
        }
      })
      .catch(() => {
        if (isMounted) {
          clearStoredAuth()
          setToken(null)
          setUser(null)
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = async ({ email, password, rememberMe = true }) => {
    const normalizedEmail = (email || '').trim().toLowerCase()

    try {
      const response = await authApi.login({ email: normalizedEmail, password })
      const { token: receivedToken, user: receivedUser } = response.data

      persistToken(receivedToken, rememberMe)
      setToken(receivedToken)
      setUser(receivedUser)

      return {
        success: true,
        user: receivedUser,
        message: response.message || 'Đăng nhập thành công',
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Đăng nhập không thành công. Vui lòng thử lại.'
      return {
        success: false,
        requiresVerification: Boolean(error.response?.data?.requiresVerification),
        unverifiedEmail: error.response?.data?.unverifiedEmail || normalizedEmail,
        message,
        errors: error.response?.data?.errors || [],
      }
    }
  }

  const loginWithGoogle = async (googleAuthPayload) => {
    try {
      const response = await authApi.googleLogin(googleAuthPayload)
      const { token: receivedToken, user: receivedUser } = response.data || {}

      if (receivedToken) {
        persistToken(receivedToken, true)
        setToken(receivedToken)
        setUser(receivedUser)
      }

      return {
        success: true,
        user: receivedUser,
        message: response.message || 'Đăng nhập Google thành công!',
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Đăng nhập bằng tài khoản Google không thành công. Vui lòng thử lại.'
      return {
        success: false,
        message,
        errors: error.response?.data?.errors || [],
      }
    }
  }

  const loginWithFacebook = async (facebookAuthPayload) => {
    try {
      const response = await authApi.facebookLogin(facebookAuthPayload)
      const { token: receivedToken, user: receivedUser } = response.data || {}

      if (receivedToken) {
        persistToken(receivedToken, true)
        setToken(receivedToken)
        setUser(receivedUser)
      }

      return {
        success: true,
        user: receivedUser,
        message: response.message || 'Đăng nhập Facebook thành công!',
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Đăng nhập bằng tài khoản Facebook không thành công. Vui lòng thử lại.'
      return {
        success: false,
        message,
        errors: error.response?.data?.errors || [],
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData)
      const data = response.data || {}

      if (data.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          email: data.email,
          fullName: data.fullName,
          verificationUrl: data.verificationUrl,
          isDevMode: data.isDevMode,
          message:
            response.message ||
            'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt.',
        }
      }

      const { token: receivedToken, user: receivedUser } = data
      if (receivedToken) {
        persistToken(receivedToken, true)
        setToken(receivedToken)
        setUser(receivedUser)
      }

      return {
        success: true,
        user: receivedUser,
        message: response.message || 'Đăng ký tài khoản thành công',
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại.'
      return {
        success: false,
        message,
        errors: error.response?.data?.errors || [],
      }
    }
  }

  const verifyEmail = async (verificationToken) => {
    try {
      const response = await authApi.verifyEmail(verificationToken)
      const { token: receivedToken, user: receivedUser } = response.data || {}

      if (receivedToken && receivedUser) {
        persistToken(receivedToken, true)
        setToken(receivedToken)
        setUser(receivedUser)
      }

      return {
        success: true,
        user: receivedUser,
        message: response.message || 'Kích hoạt tài khoản thành công!',
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          'Kích hoạt tài khoản thất bại hoặc liên kết đã hết hạn.',
      }
    }
  }

  const resendVerification = async (targetEmail) => {
    try {
      const response = await authApi.resendVerification(targetEmail)
      return {
        success: true,
        data: response.data,
        message: response.message || 'Đã gửi lại email kích hoạt.',
      }
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message || 'Không thể gửi lại email kích hoạt.',
      }
    }
  }

  const logout = () => {
    disconnectSocket()
    try {
      const uid = user?._id || user?.id || user?.email
      if (uid) {
        sessionStorage.removeItem(`foodbot_chat_history_${uid}`)
      }
    } catch {}
    clearStoredAuth()
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await authApi.updateProfile(profileData)
      const updatedUser = response.data

      setUser(updatedUser)
      return {
        success: true,
        user: updatedUser,
        message: response.message || 'Cập nhật thông tin cá nhân thành công',
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Cập nhật không thành công. Vui lòng thử lại.'
      return {
        success: false,
        message,
      }
    }
  }

  const deleteAccount = async (confirmationData) => {
    try {
      const response = await authApi.deleteAccount(confirmationData)
      const userEmail = user?.email
      disconnectSocket()
      try {
        const uid = user?._id || user?.id || user?.email
        if (uid) {
          sessionStorage.removeItem(`foodbot_chat_history_${uid}`)
        }
      } catch {}
      clearStoredAuth()
      setToken(null)
      setUser(null)
      try {
        localStorage.removeItem('food_delivery_cart')
        if (userEmail) {
          const norm = userEmail.toLowerCase().trim()
          try {
            const raw = localStorage.getItem('remembered_accounts')
            if (raw) {
              const accs = JSON.parse(raw)
              delete accs[norm]
              localStorage.setItem('remembered_accounts', JSON.stringify(accs))
            }
          } catch {}
          if (localStorage.getItem('remembered_email')?.toLowerCase().trim() === norm) {
            localStorage.removeItem('remembered_email')
            localStorage.removeItem('remembered_password')
          }
        }
      } catch {
        // ignore storage errors
      }
      return {
        success: true,
        message: response.message || 'Xóa tài khoản thành công',
      }
    } catch (error) {
      const message =
        error.response?.data?.message || 'Xóa tài khoản không thành công. Vui lòng thử lại.'
      return {
        success: false,
        message,
      }
    }
  }

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe()
      if (response?.data) {
        setUser(response.data)
        return response.data
      }
    } catch {
      // ignore refresh errors
    }
    return null
  }

  // Lắng nghe cập nhật số dư ví ảo theo thời gian thực (qua Socket.io và CustomEvent)
  useEffect(() => {
    const handleWalletCustomEvent = (e) => {
      const newBalance = e.detail?.walletBalance
      if (typeof newBalance === 'number') {
        setUser((prev) => (prev ? { ...prev, walletBalance: newBalance } : prev))
      } else {
        refreshUser()
      }
    }
    window.addEventListener('wallet_updated', handleWalletCustomEvent)

    let cleanup = null
    if (token) {
      const socket = connectSocket(token)
      if (socket) {
        const handleSocketWallet = (data) => {
          if (data && typeof data.walletBalance === 'number') {
            setUser((prev) => (prev ? { ...prev, walletBalance: data.walletBalance } : prev))
          } else {
            refreshUser()
          }
        }
        const handleNotification = (notif) => {
          if (notif?.type === 'wallet') {
            refreshUser()
          }
        }
        socket.on('wallet_updated', handleSocketWallet)
        socket.on('new_notification', handleNotification)
        cleanup = () => {
          socket.off('wallet_updated', handleSocketWallet)
          socket.off('new_notification', handleNotification)
        }
      }
    }

    return () => {
      window.removeEventListener('wallet_updated', handleWalletCustomEvent)
      if (cleanup) cleanup()
    }
  }, [token])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    loginWithGoogle,
    loginWithFacebook,
    register,
    verifyEmail,
    resendVerification,
    logout,
    updateProfile,
    deleteAccount,
    setUser,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
