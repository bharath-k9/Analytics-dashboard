import { useMemo } from 'react'

/**
 * Locale-aware compact number and currency formatters.
 * Example outputs: 12.3K, 4.5M, $1.23M
 */
export function useNumberFormatters(currency: string = 'USD', locale?: string) {
  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: 'compact',
        maximumFractionDigits: 2,
      }),
    [locale]
  )

  const currencyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 2,
      }),
    [locale, currency]
  )

  return { numberFmt, currencyFmt }
}
