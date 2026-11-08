import { useEffect, useRef, useState } from 'react'

/**
 * Loads data for a request key (e.g. "2026-10-01_2026-10-31_delivered_2") and says whether the data on
 * screen belongs to that key. The last successful data stays visible while another key loads or fails,
 * but `isCurrent` is false then, so a page never presents (exports, prints) it as the current result.
 * requestKey = null -> nothing is loaded.
 *
 * @param {string|null} requestKey - changes whenever the request parameters change
 * @param {() => Promise<any>} fetcher - resolves with the data for the current key
 * @param {string} fallbackError - message when the server gives none
 * @returns {{ data: any, isCurrent: boolean, loading: boolean, error: string, retry: () => void }}
 */
export function useKeyedRequest(requestKey, fetcher, fallbackError) {
  const [state, setState] = useState({ key: null, data: null, errorKey: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  // Latest fetcher without re-running the request on every render
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (requestKey === null) return undefined
    let ignore = false

    fetcherRef
      .current()
      .then((data) => {
        if (!ignore) setState({ key: requestKey, data, errorKey: null, error: '' })
      })
      .catch((error) => {
        if (!ignore) {
          const message = error.response?.data?.message || fallbackError
          setState((prev) => ({ ...prev, errorKey: requestKey, error: message }))
        }
      })

    return () => {
      ignore = true
    }
  }, [requestKey, attempt, fallbackError])

  const isCurrent = requestKey !== null && state.key === requestKey
  const error = state.errorKey === requestKey ? state.error : ''

  const retry = () => {
    setState((prev) => ({ ...prev, errorKey: null, error: '' }))
    setAttempt((value) => value + 1)
  }

  return { data: state.data, isCurrent, loading: requestKey !== null && !isCurrent && !error, error, retry }
}

export default useKeyedRequest
