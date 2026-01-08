import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Normalize email
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return isValidEmail(trimmed) ? trimmed : null;
}

// Normalize phone number (Georgian format)
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  // Remove spaces, dashes, parentheses
  const cleaned = phone.toString().replace(/[\s\-\(\)]/g, "");
  // If empty after cleaning, return null
  if (!cleaned) return null;
  return cleaned;
}

// Format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Format duration
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

// Parse address field (Georgian format: "Category - City, Address")
export function parseAddress(address: string | null | undefined): {
  category: string | null;
  city: string | null;
  fullAddress: string | null;
} {
  if (!address) {
    return { category: null, city: null, fullAddress: null };
  }

  const parts = address.split(" - ");
  const category = parts[0]?.trim() || null;

  let city: string | null = null;
  let fullAddress: string | null = null;

  if (parts[1]) {
    fullAddress = parts[1].trim();
    // Try to extract city (usually before the first comma)
    const cityMatch = parts[1].match(/^([^,]+)/);
    city = cityMatch ? cityMatch[1].trim() : null;
  }

  return { category, city, fullAddress };
}

// =====================
// 08.GE CSV CLEANING UTILITIES
// =====================

// Clean company name - remove "| 08.GE" suffix
export function cleanCompanyName(name: string | null | undefined): string | null {
  if (!name) return null;
  // Remove "| 08.GE" suffix and trim
  const cleaned = name.replace(/\s*\|\s*08\.GE\s*$/i, "").trim();
  return cleaned || null;
}

// Parse 08.ge address format
// Input: "თბილისი / (დიდუბე) ცაბაძე გიორგის ქ. -8ბ"
// Output: { city: "თბილისი", district: "დიდუბე", address: "ცაბაძე გიორგის ქ. -8ბ" }
export function parse08geAddress(address: string | null | undefined): {
  city: string | null;
  district: string | null;
  address: string | null;
} {
  if (!address) {
    return { city: null, district: null, address: null };
  }

  const trimmed = address.trim();

  // Pattern: "City / (District) Street" or "City / Street"
  const match = trimmed.match(/^([^/]+)\s*\/\s*(?:\(([^)]+)\)\s*)?(.*)$/);

  if (match) {
    const city = match[1]?.trim() || null;
    const district = match[2]?.trim() || null;
    let streetAddress = match[3]?.trim() || null;

    // Clean up the street address (remove leading dashes, extra spaces)
    if (streetAddress) {
      streetAddress = streetAddress.replace(/^-\s*/, "").trim();
    }

    return { city, district, address: streetAddress };
  }

  // If pattern doesn't match, return original as address
  return { city: null, district: null, address: trimmed };
}

// Validate Georgian phone number
// Valid: 995XXXXXXXXX (12 digits), 5XXXXXXXX (9 digits), 3XXXXXXXX (9 digits)
// Invalid: "დროებით მიუწვდომელია", "*5500", short numbers like "116006"
export function isValidGeorgianPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;

  const cleaned = phone.toString().replace(/[\s\-\(\)]/g, "");

  // Check for Georgian text (invalid)
  if (/[ა-ჰ]/.test(cleaned)) return false;

  // Check for special numbers starting with *
  if (cleaned.startsWith("*")) return false;

  // Must be only digits
  if (!/^\d+$/.test(cleaned)) return false;

  // Valid lengths: 9 digits (local) or 12 digits (with country code)
  const len = cleaned.length;
  if (len < 9 || len > 12) return false;

  // If 12 digits, must start with 995
  if (len === 12 && !cleaned.startsWith("995")) return false;

  // If 9 digits, must start with 5 or 3 (mobile) or 32 (Tbilisi landline)
  if (len === 9) {
    if (!cleaned.startsWith("5") && !cleaned.startsWith("3")) return false;
  }

  return true;
}

// Clean and validate identification code
// Georgian company ID: 9-11 digits
export function cleanIdentificationCode(code: string | null | undefined): string | null {
  if (!code) return null;

  // Remove any non-digit characters
  const cleaned = code.toString().replace(/\D/g, "");

  // Valid Georgian identification codes are 9-11 digits
  if (cleaned.length < 9 || cleaned.length > 11) return null;

  return cleaned;
}
