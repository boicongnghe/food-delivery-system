import { createContext, useContext, useEffect, useRef, useState } from 'react'

export const CartContext = createContext(null)

const GUEST_CART_KEY = 'food_delivery_cart_guest'
const EMPTY_CART = { restaurant: null, items: [] }

const getCartKey = (userId) =>
  userId ? `food_delivery_cart_${userId}` : GUEST_CART_KEY

const loadCart = (userId) => {
  try {
    const raw = localStorage.getItem(getCartKey(userId))
    return raw ? JSON.parse(raw) : EMPTY_CART
  } catch {
    return EMPTY_CART
  }
}

const saveCart = (cart, userId) => {
  try {
    localStorage.setItem(getCartKey(userId), JSON.stringify(cart))
  } catch (err) {
    console.error('Failed to save cart to localStorage', err)
  }
}

export function CartProvider({ children, userId }) {
  const userIdRef = useRef(userId)
  const [cart, setCart] = useState(() => loadCart(userId))

  // ── Switch cart when user logs in / out ──────────────────────────────────
  useEffect(() => {
    const prevId = userIdRef.current
    userIdRef.current = userId

    if (prevId !== userId) {
      // Save previous cart state before switching
      saveCart(cart, prevId)
      // Load the new user's cart (or empty guest cart)
      setCart(loadCart(userId))
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist to localStorage whenever cart changes ────────────────────────
  useEffect(() => {
    saveCart(cart, userId)
  }, [cart, userId])

  // ── addToCart ────────────────────────────────────────────────────────────
  const addToCart = (food, quantity = 1, note = '') => {
    const restaurantName =
      food.restaurantName ||
      (typeof food.restaurant === 'string' ? food.restaurant : food.restaurant?.name) ||
      'Quán Ăn'

    const restaurantId =
      food.restaurantId ||
      food.restaurant?._id ||
      (typeof food.restaurant === 'string' && food.restaurant.length === 24
        ? food.restaurant
        : `res-${encodeURIComponent(restaurantName.trim().toLowerCase())}`)

    setCart((prev) => {
      const isDifferentRestaurant =
        prev.restaurant &&
        prev.items.length > 0 &&
        ((prev.restaurant.id && prev.restaurant.id !== restaurantId) ||
          (prev.restaurant.name &&
            prev.restaurant.name.trim().toLowerCase() !== restaurantName.trim().toLowerCase()))

      if (isDifferentRestaurant) {
        const confirmChange = window.confirm(
          `Giỏ hàng của bạn đang có món từ "${prev.restaurant.name}". Mỗi đơn hàng chỉ được đặt từ 1 quán duy nhất.\n\nBạn có muốn XÓA giỏ hàng hiện tại để chọn món từ "${restaurantName}" không?`
        )
        if (!confirmChange) return prev

        return {
          restaurant: { id: restaurantId, name: restaurantName },
          items: [{ food, quantity, note }],
        }
      }

      const existingIndex = prev.items.findIndex(
        (item) => (item.food._id || item.food.id) === (food._id || food.id)
      )

      let newItems = [...prev.items]
      if (existingIndex > -1) {
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newItems[existingIndex].quantity + quantity,
          note: note || newItems[existingIndex].note,
        }
      } else {
        newItems.push({ food, quantity, note })
      }

      return {
        restaurant: { id: restaurantId, name: restaurantName },
        items: newItems,
      }
    })
  }

  // ── updateQuantity ───────────────────────────────────────────────────────
  const updateQuantity = (foodId, delta) => {
    setCart((prev) => {
      const targetIndex = prev.items.findIndex(
        (item) => (item.food._id || item.food.id) === foodId
      )
      if (targetIndex === -1) return prev

      const newQty = prev.items[targetIndex].quantity + delta
      let newItems

      if (newQty <= 0) {
        newItems = prev.items.filter(
          (item) => (item.food._id || item.food.id) !== foodId
        )
      } else {
        newItems = [...prev.items]
        newItems[targetIndex] = {
          ...newItems[targetIndex],
          quantity: newQty,
        }
      }

      return {
        restaurant: newItems.length === 0 ? null : prev.restaurant,
        items: newItems,
      }
    })
  }

  // ── removeFromCart ───────────────────────────────────────────────────────
  const removeFromCart = (foodId) => {
    setCart((prev) => {
      const newItems = prev.items.filter(
        (item) => (item.food._id || item.food.id) !== foodId
      )
      return {
        restaurant: newItems.length === 0 ? null : prev.restaurant,
        items: newItems,
      }
    })
  }

  // ── clearCart — gọi sau khi đặt hàng thành công ──────────────────────────
  const clearCart = () => {
    setCart(EMPTY_CART)
  }

  // ── removeUnavailableItems — gọi khi nhà hàng đóng / hết món ────────────
  // Truyền vào mảng foodId còn available từ server
  const removeUnavailableItems = (availableFoodIds) => {
    setCart((prev) => {
      const newItems = prev.items.filter((item) =>
        availableFoodIds.includes(item.food._id || item.food.id)
      )
      return {
        restaurant: newItems.length === 0 ? null : prev.restaurant,
        items: newItems,
      }
    })
  }

  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cart.items.reduce(
    (total, item) => total + item.food.price * item.quantity,
    0
  )

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        removeUnavailableItems,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

// useCart hook is in ./useCart.js (required for Vite HMR Fast Refresh)
