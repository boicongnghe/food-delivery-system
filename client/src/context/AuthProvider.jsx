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

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('token')
    if (savedToken && savedToken.startsWith('mock-token-')) {
      const savedDemoUser = localStorage.getItem('demo_user')
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
    const savedToken = localStorage.getItem('token')
    return !!savedToken && !savedToken.startsWith('mock-token-')
  })

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
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
          localStorage.removeItem('token')
          localStorage.removeItem('demo_user')
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

  const login = async ({ email, password }) => {
    const normalizedEmail = (email || '').trim().toLowerCase()

    try {
      const response = await authApi.login({ email: normalizedEmail, password })
      const { token: receivedToken, user: receivedUser } = response.data

      localStorage.setItem('token', receivedToken)
      localStorage.removeItem('demo_user')
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
        localStorage.setItem('token', mockToken)
        localStorage.setItem('demo_user', JSON.stringify(demoUser))
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
        message,
        errors: error.response?.data?.errors || [],
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await authApi.register(userData)
      const { token: receivedToken, user: receivedUser } = response.data

      localStorage.setItem('token', receivedToken)
      localStorage.removeItem('demo_user')
      setToken(receivedToken)
      setUser(receivedUser)

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

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('demo_user')
    setToken(null)
    setUser(null)
  }

  const updateProfile = async (profileData) => {
    try {
      const savedToken = localStorage.getItem('token')

      if (savedToken && savedToken.startsWith('mock-token-')) {
        const updated = {
          ...user,
          ...profileData,
        }
        localStorage.setItem('demo_user', JSON.stringify(updated))
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

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
