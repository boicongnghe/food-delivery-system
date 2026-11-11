import { Timer } from 'lucide-react'
import AdminPageHeader from '../../components/AdminPageHeader/AdminPageHeader.jsx'
import OrderTimeoutSection from './components/OrderTimeoutSection.jsx'
import ViolationPolicySection from './components/ViolationPolicySection.jsx'

// Operation settings: each section loads and saves its own group
export default function AdminSettings() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <AdminPageHeader
        icon={Timer}
        title="Cấu hình vận hành"
        description="Thời hạn xử lý đơn và ngưỡng tự động đình chỉ tài khoản vi phạm. Mỗi nhóm lưu riêng."
      />
      <OrderTimeoutSection />
      <ViolationPolicySection />
    </div>
  )
}
