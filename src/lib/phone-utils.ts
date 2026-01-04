/**
 * Phone Number Utilities for Bangladesh
 * Normalizes phone numbers to consistent format for SMS
 */

/**
 * Normalize Bangladesh phone number to E.164 format (880XXXXXXXXX)
 * Handles: +880, 880, 01, 1, etc.
 */
export function normalizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + if exists
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // Handle various formats:
  // +8801712345678 -> 8801712345678
  // 8801712345678 -> 8801712345678
  // 01712345678 -> 8801712345678
  // 1712345678 -> 8801712345678
  
  if (cleaned.startsWith('880')) {
    // Already has country code
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    // Starts with 0, add country code
    return '880' + cleaned.substring(1);
  } else if (cleaned.length === 10 && cleaned.startsWith('1')) {
    // Just the number without 0, add country code
    return '880' + cleaned;
  }
  
  // Return as-is if we can't determine format
  return cleaned;
}

/**
 * Format phone for display (01XXXXXXXXX format)
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';
  
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.startsWith('880')) {
    return '0' + normalized.substring(3);
  }
  
  return phone;
}

/**
 * Validate if phone is a valid Bangladesh mobile number
 */
export function isValidBDPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  
  // Bangladesh mobile numbers: 880 + 1 + operator digit + 8 digits = 13 digits
  // Valid operators: 3,4,5,6,7,8,9
  const bdMobileRegex = /^8801[3-9]\d{8}$/;
  
  return bdMobileRegex.test(normalized);
}

/**
 * Get phone number in format suitable for SMS API
 */
export function getPhoneForSMS(phone: string | null | undefined): string {
  return normalizePhoneNumber(phone);
}
