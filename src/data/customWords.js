const KEY = 'tup-custom-words';

export function getCustomWords() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((w) => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

export function saveCustomWords(words) {
  localStorage.setItem(KEY, JSON.stringify(words));
}

export function addCustomWord(word) {
  const w = String(word).trim().replace(/\s+/g, ' ');
  if (!w) return getCustomWords();
  const words = getCustomWords();
  if (!words.some((x) => x.toLowerCase() === w.toLowerCase())) {
    words.push(w);
    saveCustomWords(words);
  }
  return words;
}

export function removeCustomWord(word) {
  const words = getCustomWords().filter((x) => x !== word);
  saveCustomWords(words);
  return words;
}
