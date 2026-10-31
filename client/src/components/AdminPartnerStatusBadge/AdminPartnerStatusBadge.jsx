import { PARTNER_STATUSES } from '../../utils/partnerLabels.js'
import AdminBadge from '../AdminBadge/AdminBadge.jsx'

// Approval status of a restaurant / shipper profile
export default function AdminPartnerStatusBadge({ status }) {
  const meta = PARTNER_STATUSES[status] || { label: status, tone: 'slate' }
  return <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
}
