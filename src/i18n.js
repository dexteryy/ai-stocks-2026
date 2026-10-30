'use strict';
const LANGUAGE_STORAGE_KEY = 'ai-equity-language';

function resolveLanguage(saved, preferredLanguages = []) {
  if (saved === 'zh' || saved === 'en') return saved;
  const primary = preferredLanguages.find(value => typeof value === 'string' && value.trim());
  if (!primary) return 'zh';
  return /^zh(?:[-_]|$)/i.test(primary.trim()) ? 'zh' : 'en';
}

function loadLanguagePreference() {
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY); }
  catch { return null; }
}

function saveLanguagePreference(language) {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); }
  catch { /* Switching still works when browser storage is unavailable. */ }
}
