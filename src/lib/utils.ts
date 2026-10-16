import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getUrgencyClass(seconds: number): string {
  if (seconds < 60) return 'urgency-green'
  if (seconds < 180) return 'urgency-yellow'
  return 'urgency-red'
}

export function generateToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Format a money amount (Prisma Decimals arrive as strings) in the restaurant currency
export function formatMoney(
  amount: number | string,
  currency: string = 'EUR',
  locale: string = 'en',
): string {
  const n = Number(amount)
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(
      Number.isFinite(n) ? n : 0,
    )
  } catch {
    return `${currency} ${(Number.isFinite(n) ? n : 0).toFixed(2)}`
  }
}

// Only http(s) URLs may be opened from user-configured links
export function isHttpUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value)
}
