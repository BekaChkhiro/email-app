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
