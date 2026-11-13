import { Navigate, useSearchParams } from 'react-router-dom'
import { HEARING_SEGMENTS } from '../../api/hearingApi.js'

/**
 * Old hearing pages (/delivery-issues, /restaurant/delivery-issues, /shipper/issues) held delivery issues only.
 * Invitations already sent still link there with ?id=: keep the id and say it is a delivery issue.
 * @param {string} to - new hearing page of the portal
 */
export default function LegacyHearingRedirect({ to }) {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id')
  return <Navigate to={id ? `${to}?type=${HEARING_SEGMENTS.delivery_issue}&id=${encodeURIComponent(id)}` : to} replace />
}
