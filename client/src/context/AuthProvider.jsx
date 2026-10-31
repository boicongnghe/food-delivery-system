import { useEffect, useState } from 'react'
import authApi from '../api/authApi.js'
import { AuthContext } from './authContext.js'

const DEMO_ACCOUNTS = {
  'khachhang@fooddelivery.vn': {
    _id: 'demo-customer-1',
    fullName: 'Nguyễn Văn Khách',
    email: 'khachhang@fooddelivery.vn',
    role: 'customer',
    phone: '0901234567',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString(),
  },
  'chuquan@fooddelivery.vn': {
    _id: 'demo-owner-1',
    fullName: 'Trần Văn Quán Ăn',
    email: 'chuquan@fooddelivery.vn',
    role: 'restaurant_owner',
    phone: '0912345678',
    avatar: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString(),
    restaurantDetails: {
      restaurantName: 'Cơm Tấm Ba Ghiền',
      restaurantAddress: '84 Đặng Văn Ngữ, P.10, Q.Phú Nhuận, TP.HCM',
      businessItems: 'Cơm tấm sườn bì chả, sườn cây nướng, canh rong biển thịt bằm',
      ownerCitizenId: '079201007788',
      businessLicense: {
        fileName: 'giay_phep_kinh_doanh_baghien.pdf',
        fileSize: 1245000,
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
      },
    },
  },
  'taixe@fooddelivery.vn': {
    _id: 'demo-shipper-1',
    fullName: 'Lê Văn Tài Xế',
    email: 'taixe@fooddelivery.vn',
    role: 'shipper',
    phone: '0923456789',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString(),
    shipperDetails: {
      dateOfBirth: '1996-10-12',
      citizenId: '079200008899',
      vehicleInfo: 'Honda Wave Alpha - Biển số: 59-P1 888.88',
      vehicleInsurance: {
        hasInsurance: true,
        submitLater: false,
        insuranceInfo: 'Bảo hiểm TNDS Bưu Điện (PTI) - Hạn đến 12/2027',
      },
    },
  },
  'admin@fooddelivery.vn': {
    _id: 'demo-admin-1',
    fullName: 'Hệ Thống Quản Trị Viên',
    email: 'admin@fooddelivery.vn',
    role: 'admin',
    phone: '0999999999',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
    createdAt: new Date().toISOString(),
  },
}

const getStoredToken = () => localStorage.getItem('token') || sessionStorage.getItem('token')
const clearStoredAuth = () => {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
  localStorage.removeItem('demo_user')
  sessionStorage.removeItem('demo_user')
}
const persistToken = (receivedToken, rememberMe = true) => {
  if (rememberMe) {
    localStorage.setItem('token', receivedToken)
    sessionStorage.removeItem('token')
  } else {
    sessionStorage.setItem('token', receivedToken)
    localStorage.removeItem('token')
  }
  localStorage.removeItem('demo_user')
  sessionStorage.removeItem('demo_user')
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken())
  const [user, setUser] = useState(() => {
    const savedToken = getStoredToken()
    if (savedToken && savedToken.startsWith('mock-token-')) {
      const savedDemoUser = localStorage.getItem('demo_user') || sessionStorage.getItem('demo_user')
      if (savedDemoUser) {
        try {
          return JSON.parse(savedDemoUser)
        } catch {
          return null
        }
      }
    }
    return null
  })

  const [loading, setLoading] = useState(() => {
    const savedToken = getStoredToken()
    return !!savedToken && !savedToken.startsWith('mock-token-')
  })

  useEffect(() => {
    const savedToken = getStoredToken()
    if (!savedToken || savedToken.startsWith('mock-token-')) {
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
      if (
        normalizedEmail === 'taixe@fooddelivery.vn'
        && password === 'password123'
      ) {
        return {
          success: false,
          message: error.response?.data?.message
            || 'Không thể kết nối backend. Hãy khởi động server để đăng nhập tài khoản tài xế mẫu.',
          errors: error.response?.data?.errors || [],
        }
      }

      // Fallback for demo accounts if backend is unreachable or db IP is not whitelisted
      if (DEMO_ACCOUNTS[normalizedEmail] && password === 'password123') {
        const demoUser = DEMO_ACCOUNTS[normalizedEmail]
        const mockToken = `mock-token-${demoUser.role}`
        if (rememberMe) {
          localStorage.setItem('token', mockToken)
          localStorage.setItem('demo_user', JSON.stringify(demoUser))
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('demo_user')
        } else {
          sessionStorage.setItem('token', mockToken)
          sessionStorage.setItem('demo_user', JSON.stringify(demoUser))
          localStorage.removeItem('token')
          localStorage.removeItem('demo_user')
        }
        setToken(mockToken)
        setUser(demoUser)
        return {
          success: true,
          user: demoUser,
          message: 'Đăng nhập tài khoản mẫu thành công',
        }
      }

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
    clearStoredAuth()
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (profileData) => {
    try {
      const savedToken = getStoredToken()

      if (savedToken && savedToken.startsWith('mock-token-')) {
        const updated = {
          ...user,
          ...profileData,
        }
        if (localStorage.getItem('token')) {
          localStorage.setItem('demo_user', JSON.stringify(updated))
        } else {
          sessionStorage.setItem('demo_user', JSON.stringify(updated))
        }
        setUser(updated)
        return {
          success: true,
          user: updated,
          message: 'Cập nhật thông tin cá nhân thành công',
        }
      }

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
      clearStoredAuth()
      setToken(null)
      setUser(null)
      try {
        localStorage.removeItem('food_delivery_cart')
        if (userEmail && localStorage.getItem('remembered_email') === userEmail) {
          localStorage.removeItem('remembered_email')
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
