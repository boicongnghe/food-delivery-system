import AdminBadge from '../../../components/AdminBadge/AdminBadge.jsx'
import { PARTNER_STATUSES } from '../constants.js'

// Approval status of a restaurant / shipper profile
export default function PartnerStatusBadge({ status }) {
  const meta = PARTNER_STATUSES[status] || { label: status, tone: 'slate' }
  return <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
}
