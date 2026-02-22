import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatPrice,
  formatQuantity,
  formatPnL,
  formatPercentage,
  formatRelativeTime,
  pnlColor,
} from './format'

describe('formatPrice', () => {
  it('formats price with 2 decimal places', () => {
    expect(formatPrice(245.3)).toBe('$245.30')
  })

  it('formats price with comma separation for thousands', () => {
    expect(formatPrice(1000)).toBe('$1,000.00')
  })

  it('formats zero correctly', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })

  it('formats large numbers with multiple commas', () => {
    expect(formatPrice(1234567.89)).toBe('$1,234,567.89')
  })

  it('formats negative prices', () => {
    expect(formatPrice(-50.25)).toBe('-$50.25')
  })
})

describe('formatQuantity', () => {
  it('formats whole numbers without decimals', () => {
    expect(formatQuantity(50)).toBe('50')
  })

  it('formats thousands with comma separation', () => {
    expect(formatQuantity(1000)).toBe('1,000')
  })

  it('removes decimal places', () => {
    expect(formatQuantity(50.99)).toBe('51')
  })

  it('formats zero correctly', () => {
    expect(formatQuantity(0)).toBe('0')
  })

  it('formats large numbers', () => {
    expect(formatQuantity(123456)).toBe('123,456')
  })
})

describe('formatPnL', () => {
  it('formats positive P&L with plus sign', () => {
    expect(formatPnL(1230.45)).toBe('+$1,230.45')
  })

  it('formats negative P&L with minus sign', () => {
    expect(formatPnL(-89.2)).toBe('-$89.20')
  })

  it('formats zero P&L', () => {
    expect(formatPnL(0)).toBe('+$0.00')
  })

  it('formats small positive values', () => {
    expect(formatPnL(0.01)).toBe('+$0.01')
  })

  it('formats large positive values with commas', () => {
    expect(formatPnL(123456.78)).toBe('+$123,456.78')
  })

  it('formats large negative values with commas', () => {
    expect(formatPnL(-9876.54)).toBe('-$9,876.54')
  })
})

describe('formatPercentage', () => {
  it('formats positive percentage with plus sign', () => {
    expect(formatPercentage(0.0251)).toBe('+2.51%')
  })

  it('formats negative percentage with minus sign', () => {
    expect(formatPercentage(-0.0034)).toBe('-0.34%')
  })

  it('formats zero percentage', () => {
    expect(formatPercentage(0)).toBe('+0.00%')
  })

  it('formats large percentages', () => {
    expect(formatPercentage(1.5)).toBe('+150.00%')
  })

  it('formats small percentages', () => {
    expect(formatPercentage(0.0001)).toBe('+0.01%')
  })

  it('formats negative large percentages', () => {
    expect(formatPercentage(-0.99)).toBe('-99.00%')
  })
})

describe('pnlColor', () => {
  it('returns emerald color for positive values', () => {
    expect(pnlColor(100)).toBe('text-emerald-400')
  })

  it('returns red color for negative values', () => {
    expect(pnlColor(-100)).toBe('text-red-400')
  })

  it('returns muted color for zero', () => {
    expect(pnlColor(0)).toBe('text-muted-foreground')
  })

  it('returns emerald color for small positive values', () => {
    expect(pnlColor(0.01)).toBe('text-emerald-400')
  })

  it('returns red color for small negative values', () => {
    expect(pnlColor(-0.01)).toBe('text-red-400')
  })
})

describe('formatRelativeTime', () => {
  it('formats time less than 1 minute as "just now"', () => {
    const timestamp = Date.now() - 30 * 1000 // 30 seconds ago
    expect(formatRelativeTime(timestamp)).toBe('just now')
  })

  it('formats minutes ago correctly', () => {
    const timestamp = Date.now() - 2 * 60 * 1000 // 2 minutes ago
    expect(formatRelativeTime(timestamp)).toBe('2 min ago')
  })

  it('formats singular minute correctly', () => {
    const timestamp = Date.now() - 1 * 60 * 1000 // 1 minute ago
    expect(formatRelativeTime(timestamp)).toBe('1 min ago')
  })

  it('formats hours ago correctly', () => {
    const timestamp = Date.now() - 3 * 60 * 60 * 1000 // 3 hours ago
    expect(formatRelativeTime(timestamp)).toBe('3 hours ago')
  })

  it('formats singular hour correctly', () => {
    const timestamp = Date.now() - 1 * 60 * 60 * 1000 // 1 hour ago
    expect(formatRelativeTime(timestamp)).toBe('1 hour ago')
  })

  it('formats 23 hours ago as relative time', () => {
    const timestamp = Date.now() - 23 * 60 * 60 * 1000 // 23 hours ago
    expect(formatRelativeTime(timestamp)).toBe('23 hours ago')
  })

  it('formats times >= 24h ago with absolute time', () => {
    const timestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
    const result = formatRelativeTime(timestamp)
    // Should contain "Yesterday" since it's within 48 hours
    expect(result).toContain('Yesterday')
  })

  it('formats old dates with month and day', () => {
    const oldDate = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
    const result = formatRelativeTime(oldDate)
    // Should contain a month name (abbreviated)
    expect(result).toMatch(/\w{3} \d{1,2}, \d{2}:\d{2}/)
  })
})

