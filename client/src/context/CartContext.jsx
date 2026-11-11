import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { cartLineKey } from '../utils/cartLineKey.js'
import { foodApi } from '../api/foodApi.js'
import { confirmToast } from '../utils/confirmToast.jsx'

export const CartContext = createContext(null)

const GUEST_CART_KEY = 'food_delivery_cart_guest'
const EMPTY_CART = { restaurant: null, items: [] }

const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)

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

  // Dynamically resolve and heal restaurant MongoDB ObjectId from database if missing or invalid
  useEffect(() => {
    const rId = cart?.restaurant?.id
    const rName = cart?.restaurant?.name
    if (rName && (!rId || !isValidObjectId(rId))) {
      let isMounted = true
      foodApi
        .getRestaurants()
        .then((res) => {
          if (!isMounted) return
          const dbRestaurants = res.data?.data || res.data || []
          const match = dbRestaurants.find(
            (r) => (r.name || '').trim().toLowerCase() === rName.trim().toLowerCase()
          )
          if (match?._id) {
            setCart((prev) => ({
              ...prev,
              restaurant: {
                ...prev.restaurant,
                id: match._id,
              },
            }))
          }
        })
        .catch((err) => {
          console.warn('Could not auto-heal cart restaurant from DB:', err?.message)
        })
      return () => {
        isMounted = false
      }
    }
  }, [cart?.restaurant?.id, cart?.restaurant?.name])

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

  // Latest cart for addToCart, which reads it after an await
  const cartRef = useRef(cart)
  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  // ── addToCart ────────────────────────────────────────────────────────────
  // Resolves true when the dish was added, false when the customer kept the other restaurant's cart
  const addToCart = async (food, quantity = 1, note = '', options = {}) => {
    const restaurantName =
      food.restaurantName ||
      (typeof food.restaurant === 'string' ? food.restaurant : food.restaurant?.name) ||
      'Quán Ăn'

    const rawRestId =
      food.restaurantId ||
      food.restaurant?._id ||
      (typeof food.restaurant === 'string' && food.restaurant.length === 24
        ? food.restaurant
        : null)

    const restaurantId =
      rawRestId && isValidObjectId(rawRestId)
        ? rawRestId
        : `res-${encodeURIComponent(restaurantName.trim().toLowerCase())}`

    // Another restaurant in the cart: ask first (one order = one restaurant). Asked outside setCart:
    // a state updater must stay synchronous.
    const current = cartRef.current
    const isDifferentRestaurant =
      current.restaurant &&
      current.items.length > 0 &&
      ((current.restaurant.id && current.restaurant.id !== restaurantId) ||
        (current.restaurant.name &&
          current.restaurant.name.trim().toLowerCase() !== restaurantName.trim().toLowerCase()))

    if (isDifferentRestaurant) {
      // Khi chọn "Đặt ngay" (isBuyNow), tự động thay thế giỏ hàng bằng quán mới mà không hiển thị modal chặn
      if (!options?.isBuyNow) {
        const confirmed = await confirmToast(
          `Giỏ hàng của bạn đang có món từ "${current.restaurant.name}". Mỗi đơn hàng chỉ được đặt từ 1 quán duy nhất.\n\nXóa giỏ hàng hiện tại để chọn món từ "${restaurantName}"?`,
          { confirmLabel: 'Xóa giỏ & thêm món', danger: true }
        )
        if (!confirmed) return false
      }
      setCart({
        restaurant: { id: restaurantId, name: restaurantName },
        items: [{ food, quantity, note }],
      })
      return true
    }

    setCart((prev) => {
      // Same restaurant or empty cart
      const existingIndex = prev.items.findIndex(
        (item) => cartLineKey(item.food) === cartLineKey(food)
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
    return true
  }

  // ── updateQuantity ───────────────────────────────────────────────────────
  const updateQuantity = (foodId, delta) => {
    setCart((prev) => {
      const targetIndex = prev.items.findIndex((item) => {
        const key = cartLineKey(item.food)
        return (
          key === foodId ||
          item.food?.id === foodId ||
          item.food?._id === foodId ||
          String(key) === String(foodId) ||
          String(item.food?._id) === String(foodId) ||
          String(item.food?.id) === String(foodId)
        )
      })
      if (targetIndex === -1) return prev

      const newQty = prev.items[targetIndex].quantity + delta
      let newItems

      if (newQty <= 0) {
        newItems = prev.items.filter((_, idx) => idx !== targetIndex)
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
      const newItems = prev.items.filter((item) => {
        const key = cartLineKey(item.food)
        const matches =
          key === foodId ||
          item.food?.id === foodId ||
          item.food?._id === foodId ||
          String(key) === String(foodId) ||
          String(item.food?._id) === String(foodId) ||
          String(item.food?.id) === String(foodId)
        return !matches
      })
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

export { useCart } from './useCart.js'
