const KEY = 'cookie-consent';

export function getCookieConsent() {
  try {
    return localStorage.getItem(KEY);
  } catch (_) {
    return null;
  }
}

export function setCookieConsent(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch (_) {}
  try {
    // Also set a cookie for server-side awareness (1 year)
    document.cookie = `cookie_consent=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (_) {}
  
  // Dispatch custom event to notify listeners
  try {
    window.dispatchEvent(new CustomEvent('consentchange', { detail: { consent: value } }));
  } catch (_) {}
}

export function hasConsent() {
  return getCookieConsent() === 'accepted';
}
