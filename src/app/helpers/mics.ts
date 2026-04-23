export function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    const randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
  }

  return array
}

/*
 * lang: 'en-GB' | 'en-US' | 'fr-FR' | ...
 */
export const speakWord = (origin: string, lang = 'en-GB', rate = 0.8) => {
  if ('speechSynthesis' in window && origin) {
    window.speechSynthesis.cancel() // Cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(origin)
    utterance.pitch = 1.8
    utterance.lang = lang
    utterance.rate = rate
    window.speechSynthesis.speak(utterance)
  }
}
