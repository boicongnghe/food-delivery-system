// Same rule as the server (violationService): a penalty that brings the account to the threshold suspends it too.
// Penalties of delivery issues and complaints count together.
// penalty = { target, action } chosen in the form, or null; autoSuspend = { threshold, counts: { shipper, restaurant, customer } }
export const willAutoSuspend = (penalty, autoSuspend) =>
  Boolean(penalty?.target) &&
  Boolean(penalty.action) &&
  penalty.action !== 'suspend' &&
  autoSuspend?.threshold > 0 &&
  (autoSuspend.counts[penalty.target] || 0) + 1 >= autoSuspend.threshold

// The account ends up suspended: picked by the admin or reached the threshold
export const willSuspend = (penalty, autoSuspend) =>
  (Boolean(penalty?.target) && penalty.action === 'suspend') || willAutoSuspend(penalty, autoSuspend)
