import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'food_delivery_cart'

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) : { restaurant: null, items: [] }
    } catch {
      return { restaurant: null, items: [] }
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart))
    } catch (err) {
      console.error('Failed to save cart to localStorage', err)
    }
  }, [cart])

  const addToCart = (food, quantity = 1, note = '') => {
    const restaurantId = food.restaurantId || food.restaurant?._id || (typeof food.restaurant === 'string' && food.restaurant.length === 24 ? food.restaurant : '6ad719cbf02e3385602cfd0c')
    const restaurantName = food.restaurantName || (typeof food.restaurant === 'string' ? food.restaurant : food.restaurant?.name) || 'Quán Ăn'

    setCart((prev) => {
      // Check if item is from another restaurant
      if (prev.restaurant && prev.restaurant.id !== restaurantId && prev.items.length > 0) {
        const confirmChange = window.confirm(
          `Giỏ hàng của bạn đang có món từ "${prev.restaurant.name}". Bạn có muốn xóa giỏ hàng hiện tại để chọn món từ "${restaurantName}" không?`
        )
        if (!confirmChange) return prev

        // Reset cart for new restaurant
        return {
          restaurant: { id: restaurantId, name: restaurantName },
          items: [{ food, quantity, note }],
        }
      }

      // Same restaurant or empty cart
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

  const clearCart = () => {
    setCart({ restaurant: null, items: [] })
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
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
