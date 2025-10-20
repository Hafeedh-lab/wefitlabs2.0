import DOMPurify from 'dompurify';

export function sanitizeInput(value?: string | null) {
  if (value == null) return value ?? null;
  if (typeof window === 'undefined') {
    return value.trim();
  }
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}
