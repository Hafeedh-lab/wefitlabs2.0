// Sponsor Redemption Code Utilities

export interface RedemptionCode {
  code: string;
  eventId: string;
  sponsorId: string;
  sponsorName: string;
  offer: string;
  createdAt: string;
  redeemedAt: string | null;
  participantId: string | null;
}

/**
 * Generate a unique redemption code
 * Format: WFIT-[SPONSOR_PREFIX]-[RANDOM_4_CHARS]
 * Example: WFIT-VITA-X7B2
 */
export function generateRedemptionCode(eventId: string, sponsorName: string): string {
  const sponsorPrefix = sponsorName
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4)
    .padEnd(4, 'X');

  const randomChars = Array.from({ length: 4 }, () =>
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 36)]
  ).join('');

  return `WFIT-${sponsorPrefix}-${randomChars}`;
}

/**
 * Get or create a redemption code for an event
 */
export function getRedemptionCode(eventId: string, sponsorName: string, offer: string): RedemptionCode {
  const storageKey = `redemption-code-${eventId}`;

  // Try to get existing code from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const code: RedemptionCode = JSON.parse(stored);
        return code;
      } catch (error) {
        console.error('Failed to parse stored redemption code:', error);
      }
    }
  }

  // Generate new code
  const code: RedemptionCode = {
    code: generateRedemptionCode(eventId, sponsorName),
    eventId,
    sponsorId: `sponsor-${eventId}`,
    sponsorName,
    offer,
    createdAt: new Date().toISOString(),
    redeemedAt: null,
    participantId: null
  };

  // Store in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(code));
  }

  return code;
}

/**
 * Mark a code as redeemed
 */
export function markCodeAsRedeemed(eventId: string, participantId?: string): void {
  if (typeof window === 'undefined') return;

  const storageKey = `redemption-code-${eventId}`;
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const code: RedemptionCode = JSON.parse(stored);
      code.redeemedAt = new Date().toISOString();
      code.participantId = participantId || null;
      localStorage.setItem(storageKey, JSON.stringify(code));
    } catch (error) {
      console.error('Failed to mark code as redeemed:', error);
    }
  }
}

/**
 * Check if a code has been redeemed
 */
export function isCodeRedeemed(eventId: string): boolean {
  if (typeof window === 'undefined') return false;

  const storageKey = `redemption-code-${eventId}`;
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    try {
      const code: RedemptionCode = JSON.parse(stored);
      return code.redeemedAt !== null;
    } catch (error) {
      console.error('Failed to check if code is redeemed:', error);
    }
  }

  return false;
}
