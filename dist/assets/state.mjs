export const CONSENT_KEY = 'aaq-consent-v1';
export const CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
export function parseConsent(raw, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.necessary !== true || !Number.isFinite(value.timestamp)) return null;
    if (value.timestamp > now || now - value.timestamp > CONSENT_MAX_AGE) return null;
    return value;
  } catch { return null; }
}
