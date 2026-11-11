// Same rule as the server (deliveryIssueService): a penalty that brings the account to the threshold
// suspends it too. autoSuspend = { threshold, counts: { shipper, restaurant, customer } } from the issue detail.
export const willAutoSuspend = (form, autoSuspend) =>
  form.decision === 'resolved' &&
  form.hasPenalty &&
  Boolean(form.target) &&
  Boolean(form.action) &&
  form.action !== 'suspend' &&
  autoSuspend?.threshold > 0 &&
  (autoSuspend.counts[form.target] || 0) + 1 >= autoSuspend.threshold

// The account ends up suspended: picked by the admin or reached the threshold
export const willSuspend = (form, autoSuspend) =>
  (form.decision === 'resolved' && form.hasPenalty && form.action === 'suspend') || willAutoSuspend(form, autoSuspend)
