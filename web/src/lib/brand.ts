import type { CSSProperties } from 'react'

// Per-survey theming. The owner picks one hex color; everything brand-colored
// on the public page reads from the `--brand` CSS variable set here, and text
// placed on top of that color uses a black/white pick for legibility.

function expandHex(hex: string): string {
  const h = hex.replace('#', '')
  return h.length === 3
    ? h
        .split('')
        .map((ch) => ch + ch)
        .join('')
    : h
}

// Relative luminance (WCAG). Used to decide whether text on the brand color
// should be dark or light.
function luminance(hex: string): number {
  const h = expandHex(hex)
  const channels = [0, 2, 4].map((i) => {
    const c = Number.parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const [r, g, b] = channels as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function readableTextColor(hex: string): string {
  return luminance(hex) > 0.5 ? '#0f172a' : '#ffffff'
}

// Style object that scopes the brand color (and its readable foreground) to a
// subtree. Spread onto the wrapping element of the public survey.
export function brandStyle(hex: string): CSSProperties {
  return {
    '--brand': hex,
    '--brand-fg': readableTextColor(hex),
  } as CSSProperties
}
