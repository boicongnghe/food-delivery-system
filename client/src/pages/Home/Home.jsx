import { useEffect, useState } from 'react'
import { foodApi } from '../../api/foodApi.js'
import { useCart } from '../../context/CartContext.jsx'

function Home() {
  const [foods, setFoods] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { addToCart, cart } = useCart()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [foodsRes, restRes] = await Promise.all([
          foodApi.getFoods(),
          foodApi.getRestaurants(),
        ])
        setFoods(foodsRes.data.data || [])
        setRestaurants(restRes.data.data || [])
      } catch (err) {
        console.error('Error fetching foods:', err)
        setError('Không thể tải danh sách món ăn từ máy chủ.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const categories = ['Tất cả', ...new Set(foods.map((item) => item.category))]

  const filteredFoods = selectedCategory === 'Tất cả'
    ? foods
    : foods.filter((item) => item.category === selectedCategory)

  const activeRestaurant = restaurants[0] || (foods[0]?.restaurant)

  return (
    <div className="container animate-fade-in">
      {/* Restaurant Hero Banner */}
      {activeRestaurant && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '36px',
            marginBottom: '36px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="badge badge-delivered">Đang mở cửa</span>
              <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>
                ★ {activeRestaurant.rating || 4.8} / 5.0
              </span>
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: '2rem', fontWeight: 800 }}>
              {activeRestaurant.name}
            </h1>
            <p style={{ margin: '0 0 16px', color: '#cbd5e1', maxWidth: 600 }}>
              {activeRestaurant.description}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: '0.88rem', color: '#94a3b8' }}>
              <span>📍 {activeRestaurant.address}</span>
              <span>📞 {activeRestaurant.phone || '02438889999'}</span>
              <span>⚡ Giao hàng nhanh: 20 - 30 phút</span>
            </div>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '16px 24px',
            borderRadius: 'var(--radius-md)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}>
            <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>Mã giảm giá hot hôm nay:</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f97316', margin: '4px 0' }}>
              FREESHIP • GIAM20K
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Nhập mã ở bước thanh toán để được giảm
            </div>
          </div>
        </div>
      )}

      {/* Categories Filter (UC11) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
          Thực đơn món ngon
        </h2>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`btn btn-sm ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🍜</div>
          <p>Đang tải thực đơn từ MongoDB Atlas...</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '20px',
          background: 'var(--danger-light)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      {/* Foods Grid (UC11: Select food items) */}
      {!loading && !error && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: 24,
        }}>
          {filteredFoods.map((food) => {
            const inCartItem = cart.items.find(
              (item) => (item.food._id || item.food.id) === (food._id || food.id)
            )

            return (
              <div
                key={food._id}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                  <img
                    src={food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                    alt={food.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.3s ease',
                    }}
                  />
                  <span
                    className="badge badge-confirmed"
                    style={{ position: 'absolute', top: 12, left: 12 }}
                  >
                    {food.category}
                  </span>
                </div>

                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
                    {food.name}
                  </h3>
                  <p style={{
                    margin: '0 0 16px',
                    fontSize: '0.88rem',
                    color: 'var(--text-muted)',
                    flex: 1,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {food.description}
                  </p>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                  }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                      {food.price.toLocaleString('vi-VN')}đ
                    </span>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => addToCart(food, 1)}
                    >
                      {inCartItem ? `+ Thêm (${inCartItem.quantity})` : '+ Chọn món'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Home
