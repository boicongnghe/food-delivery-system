import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { cartLineKey } from '../utils/cartLineKey.js'
import { confirmToast } from '../utils/confirmToast.jsx'

export const CartContext = createContext(null)

const GUEST_CART_KEY = 'food_delivery_cart_guest'
const EMPTY_CART = { restaurant: null, items: [] }

const KNOWN_RESTAURANTS = {
  'cơm gà nướng & cơm rang 99 - tân xã': '6ae77e0d08ffe82f6ca8e0b0',
  'bún bò huế & bún đậu o mai - cổng fpt': '6ae77e0e08ffe82f6ca8e0b4',
  'tiệm trà sữa & ăn vặt hola tea - ngã 3 thạch hòa': '6ae77e0e08ffe82f6ca8e0b8',
  'phở bò gia truyền cụ chiêu - hòa lạc': '6ae77e0e08ffe82f6ca8e0bc',
  'hola fastfood - burger & gà rán f-ville': '6ae77e0e08ffe82f6ca8e0bf',
  'tiệm bánh mì chảo & cơm niêu sinh viên': '6ae77e0e08ffe82f6ca8e0c2',
}

const resolveKnownRestaurantId = (name, fallbackId) => {
  if (!name) return fallbackId
  const key = String(name).trim().toLowerCase()
  return KNOWN_RESTAURANTS[key] || fallbackId
}

const healCartRestaurant = (cartData) => {
  if (!cartData?.restaurant) return cartData || EMPTY_CART
  const curId = String(cartData.restaurant.id || '')
  if (curId.startsWith('res-') || !/^[0-9a-fA-F]{24}$/.test(curId)) {
    const healed = resolveKnownRestaurantId(cartData.restaurant.name, curId)
    if (healed && healed !== curId) {
      return {
        ...cartData,
        restaurant: {
          ...cartData.restaurant,
          id: healed,
        },
      }
    }
  }
  return cartData
}

const getCartKey = (userId) =>
  userId ? `food_delivery_cart_${userId}` : GUEST_CART_KEY

const loadCart = (userId) => {
  try {
    const raw = localStorage.getItem(getCartKey(userId))
    return raw ? healCartRestaurant(JSON.parse(raw)) : EMPTY_CART
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
      rawRestId && /^[0-9a-fA-F]{24}$/.test(rawRestId)
        ? rawRestId
        : resolveKnownRestaurantId(
            restaurantName,
            `res-${encodeURIComponent(restaurantName.trim().toLowerCase())}`
          )

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
