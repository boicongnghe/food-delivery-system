let audioContext = null

/**
 * Short two-tone "ting ting" generated with the Web Audio API (no sound file needed).
 * Browsers only allow sound after the user has interacted with the page (e.g. turned the bell on).
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return
    audioContext = audioContext || new AudioContextClass()
    audioContext.resume()

    const start = audioContext.currentTime
    ;[
      { frequency: 880, offset: 0 },
      { frequency: 1175, offset: 0.18 },
    ].forEach(({ frequency, offset }) => {
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start + offset)
      gain.gain.exponentialRampToValueAtTime(0.3, start + offset + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.3)
      oscillator.connect(gain).connect(audioContext.destination)
      oscillator.start(start + offset)
      oscillator.stop(start + offset + 0.32)
    })
  } catch {
    // Sound is a nice-to-have: ignore browsers that block or do not support audio
  }
}
