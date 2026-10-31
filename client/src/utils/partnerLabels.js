// Approval status of a restaurant / shipper profile
export const PARTNER_STATUSES = {
  pending: { label: 'Chờ duyệt', tone: 'amber' },
  approved: { label: 'Đang hoạt động', tone: 'emerald' },
  rejected: { label: 'Bị từ chối', tone: 'red' },
  suspended: { label: 'Đình chỉ', tone: 'red' },
}

// Status tabs of the restaurant / shipper pages, in queue order
export const PARTNER_STATUS_TABS = ['pending', 'approved', 'suspended', 'rejected', 'all']
