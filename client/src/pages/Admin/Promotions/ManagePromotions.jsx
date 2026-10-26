import { useEffect, useState } from 'react'
import { promotionApi } from '../../../api/promotionApi.js'

function ManagePromotions() {
  const [promotions, setPromotions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    description: '',
    discountType: 'fixed',
    discountValue: 20000,
    minOrderValue: 100000,
    maxDiscount: '',
    usageLimit: 100,
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    isActive: true,
  })

  const fetchPromotions = async () => {
    try {
      setLoading(true)
      const res = await promotionApi.getPromotions()
      setPromotions(res.data.data || [])
    } catch (err) {
      console.error('Failed to load promotions', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData({
      code: '',
      title: '',
      description: '',
      discountType: 'fixed',
      discountValue: 20000,
      minOrderValue: 100000,
      maxDiscount: '',
      usageLimit: 100,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      isActive: true,
    })
    setShowModal(true)
  }

  const handleOpenEdit = (rule) => {
    setEditingId(rule._id)
    setFormData({
      code: rule.code,
      title: rule.title,
      description: rule.description || '',
      discountType: rule.discountType,
      discountValue: rule.discountValue,
      minOrderValue: rule.minOrderValue,
      maxDiscount: rule.maxDiscount || '',
      usageLimit: rule.usageLimit,
      endDate: new Date(rule.endDate).toISOString().slice(0, 10),
      isActive: rule.isActive,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        discountValue: Number(formData.discountValue),
        minOrderValue: Number(formData.minOrderValue || 0),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        usageLimit: Number(formData.usageLimit || 100),
      }

      if (editingId) {
        await promotionApi.updatePromotion(editingId, payload)
      } else {
        await promotionApi.createPromotion(payload)
      }

      setShowModal(false)
      fetchPromotions()
    } catch (err) {
      alert(err.response?.data?.message || 'Có lỗi khi lưu mã khuyến mãi')
    }
  }

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mã '${code}' không?`)) return
    try {
      await promotionApi.deletePromotion(id)
      fetchPromotions()
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa mã khuyến mãi')
    }
  }

  const handleToggleActive = async (rule) => {
    try {
      await promotionApi.updatePromotion(rule._id, { isActive: !rule.isActive })
      fetchPromotions()
    } catch (err) {
      alert('Lỗi cập nhật trạng thái')
    }
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <span className="badge badge-confirmed" style={{ marginBottom: 6 }}>
            Admin Dashboard • UC14
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: 800 }}>
            Quản lý Quy tắc Khuyến mãi (Promotion Rules)
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            Tạo mới, chỉnh sửa, xóa và theo dõi lượt sử dụng voucher của khách hàng
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
          + Tạo mã Voucher mới
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <p>Đang tải danh sách voucher...</p>
        </div>
      )}

      {!loading && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.92rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Mã code</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Tiêu đề & Mô tả</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Mức giảm</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Đơn tối thiểu</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Đã dùng / Giới hạn</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Hạn dùng</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700 }}>Trạng thái</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--primary)' }}>
                      {p.code}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600 }}>{p.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.description}</div>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                      {p.discountType === 'percentage'
                        ? `${p.discountValue}% (tối đa ${(p.maxDiscount || 0).toLocaleString('vi-VN')}đ)`
                        : `${p.discountValue.toLocaleString('vi-VN')}đ`}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {p.minOrderValue.toLocaleString('vi-VN')}đ
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <strong>{p.usedCount || 0}</strong> / {p.usageLimit || '∞'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '0.85rem' }}>
                      {new Date(p.endDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(p)}
                        className={`badge ${p.isActive ? 'badge-delivered' : 'badge-cancelled'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {p.isActive ? 'Active (Bật)' : 'Inactive (Tắt)'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(p)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => handleDelete(p._id, p.code)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Promotion */}
      {showModal && (
        <div className="drawer-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ maxWidth: 560, width: '92%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '1.3rem', fontWeight: 800 }}>
              {editingId ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mã khuyến mãi mới'}
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Mã Code (*)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: HELLO2026"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tiêu đề Voucher (*)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ví dụ: Giảm 20K cho đơn từ 100K"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả chi tiết</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Điều kiện áp dụng..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Loại giảm giá</label>
                  <select
                    className="form-select"
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  >
                    <option value="fixed">Số tiền cố định (VND)</option>
                    <option value="percentage">Phần trăm (%)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Giá trị giảm ({formData.discountType === 'fixed' ? 'VNĐ' : '%'}) (*)
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    required
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Đơn hàng tối thiểu (VNĐ)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.minOrderValue}
                    onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                    min={0}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Giảm tối đa (nếu chọn %)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Không giới hạn"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    min={0}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Giới hạn số lượt dùng</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    min={1}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày hết hạn (*)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Cập nhật Voucher' : 'Tạo Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagePromotions
