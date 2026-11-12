import { DELIVERY_ISSUE_TYPE_LABELS } from './deliveryIssueLabels.js'
import { COMPLAINT_CATEGORY_LABELS } from './feedbackLabels.js'

// Wording of a hearing on the party pages, per kind of case (server caseType)
export const HEARING_CASE_LABELS = {
  delivery_issue: {
    noun: 'Sự cố giao hàng',
    kindLabels: DELIVERY_ISSUE_TYPE_LABELS,
    reportTitle: 'Shipper báo cáo lúc',
    outcomes: {
      open: 'Quản trị viên chưa kết luận',
      resolved: 'Quản trị viên đã kết luận báo cáo',
      dismissed: 'Quản trị viên đã bác bỏ báo cáo',
    },
  },
  complaint: {
    noun: 'Khiếu nại',
    kindLabels: COMPLAINT_CATEGORY_LABELS,
    reportTitle: 'Khách hàng khiếu nại lúc',
    outcomes: {
      open: 'Quản trị viên chưa kết luận',
      resolved: 'Quản trị viên đã chấp nhận khiếu nại',
      rejected: 'Quản trị viên đã không chấp nhận khiếu nại',
    },
  },
}
