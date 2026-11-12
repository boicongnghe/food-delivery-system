// Penalty part of the admin resolution forms (delivery issues UC45, complaints UC42)

export const EMPTY_PENALTY_FIELDS = { hasPenalty: false, target: '', action: '', fineAmount: '' }

/** Penalty body for the API, or null when the admin does not penalize anyone */
export const toPenalty = (form) =>
  form.hasPenalty
    ? {
        target: form.target,
        action: form.action,
        ...(form.action === 'fine' && { fineAmount: Number(form.fineAmount) }),
      }
    : null

/** Client checks of the penalty fields; keys match the server errors (penalty, penalty.target...) */
export const validatePenalty = (form, hearingState) => {
  const errors = {}
  if (!form.hasPenalty) return errors
  if (hearingState !== 'closed') errors.penalty = 'Cần kết thúc phiên đối chất trước khi xử phạt'
  if (!form.target) errors['penalty.target'] = 'Vui lòng chọn bên vi phạm'
  if (!form.action) errors['penalty.action'] = 'Vui lòng chọn hình thức xử phạt'
  if (form.action === 'fine' && !form.fineAmount) errors['penalty.fineAmount'] = 'Vui lòng nhập số tiền phạt'
  return errors
}
