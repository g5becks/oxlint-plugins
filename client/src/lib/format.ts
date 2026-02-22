/**
 * Number formatting utilities for trading data
 */

// Reusable number formatters using Intl.NumberFormat
const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const quantityFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const pnlFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
})

const percentageFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
})

/**
 * Format a price value with dollar sign and 2 decimal places
 * @example formatPrice(245.3) => "$245.30"
 */
export const formatPrice = (value: number): string => priceFormatter.format(value)

/**
 * Format a quantity value with no trailing decimals
 * @example formatQuantity(50.0) => "50"
 */
export const formatQuantity = (value: number): string => quantityFormatter.format(value)

/**
 * Format a P&L value with sign, dollar sign, and comma separation
 * @example formatPnL(1230.45) => "+$1,230.45"
 * @example formatPnL(-89.2) => "-$89.20"
 */
export const formatPnL = (value: number): string => pnlFormatter.format(value)

/**
 * Format a percentage value with sign and percent symbol
 * @example formatPercentage(0.0251) => "+2.51%"
 * @example formatPercentage(-0.0034) => "-0.34%"
 */
export const formatPercentage = (value: number): string => percentageFormatter.format(value)

/**
 * Format a timestamp as relative time (< 24h) or absolute time (>= 24h)
 * @example formatRelativeTime(Date.now() - 2 * 60 * 1000) => "2 min ago"
 * @example formatRelativeTime(Date.now() - 25 * 60 * 60 * 1000) => "Yesterday, 14:32"
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp
  const diffInHours = diff / (1000 * 60 * 60)

  // If less than 24 hours, show relative time
  if (diffInHours < 24) {
    const diffInMinutes = Math.floor(diff / (1000 * 60))

    if (diffInMinutes < 1) {
      return 'just now'
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`
    }

    const diffInHoursRounded = Math.floor(diffInMinutes / 60)
    return `${diffInHoursRounded} hour${diffInHoursRounded > 1 ? 's' : ''} ago`
  }

  // For >= 24h, show absolute time
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // Check if today
  if (date.toDateString() === today.toDateString()) {
    return `Today, ${timeStr}`
  }

  // Check if yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${timeStr}`
  }

  // Otherwise show date
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${dateStr}, ${timeStr}`
}

/**
 * Get CSS color class for P&L value
 * @returns CSS class for text color based on value sign
 */
export const pnlColor = (value: number): string => {
  if (value > 0) {
    return 'text-emerald-400'
  }
  if (value < 0) {
    return 'text-red-400'
  }
  return 'text-muted-foreground'
}
