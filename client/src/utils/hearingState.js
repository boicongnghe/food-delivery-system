// Same rule as the server (issueHearingService.getHearingState): 'none' | 'open' | 'closed'.
// Recomputed on the client so a page left open switches to "ended" when the deadline passes.
export function getHearingState(issue, now = Date.now()) {
  if (!issue?.hearing) return 'none'
  const { closedAt, deadline } = issue.hearing
  const ended = issue.status !== 'open' || Boolean(closedAt) || new Date(deadline).getTime() <= now
  return ended ? 'closed' : 'open'
}

// "còn 3 giờ 20 phút" / "còn 12 phút"
export function formatTimeLeft(deadline, now = Date.now()) {
  const minutes = Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 60000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `còn ${rest} phút`
  return rest ? `còn ${hours} giờ ${rest} phút` : `còn ${hours} giờ`
}
