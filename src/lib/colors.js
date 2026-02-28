/**
 * Predefined color palette for user personalization.
 * Each color key maps to a set of Tailwind classes.
 *
 * IMPORTANT: All classes here must be statically analyzable by Tailwind's
 * content scanner. Do not construct class names dynamically.
 */

export const COLOR_KEYS = ['blue', 'pink', 'green', 'purple', 'orange', 'red', 'teal', 'yellow']

export const COLORS = {
  blue: {
    label: 'Blauw',
    bg: 'bg-blue-400',
    bgLight: 'bg-blue-400/20',
    border: 'border-blue-400',
    text: 'text-blue-400',
    dot: 'bg-blue-400',
    bgHover: 'hover:bg-blue-400/90',
  },
  pink: {
    label: 'Roze',
    bg: 'bg-pink-400',
    bgLight: 'bg-pink-400/20',
    border: 'border-pink-400',
    text: 'text-pink-400',
    dot: 'bg-pink-400',
    bgHover: 'hover:bg-pink-400/90',
  },
  green: {
    label: 'Groen',
    bg: 'bg-emerald-400',
    bgLight: 'bg-emerald-400/20',
    border: 'border-emerald-400',
    text: 'text-emerald-400',
    dot: 'bg-emerald-400',
    bgHover: 'hover:bg-emerald-400/90',
  },
  purple: {
    label: 'Paars',
    bg: 'bg-purple-400',
    bgLight: 'bg-purple-400/20',
    border: 'border-purple-400',
    text: 'text-purple-400',
    dot: 'bg-purple-400',
    bgHover: 'hover:bg-purple-400/90',
  },
  orange: {
    label: 'Oranje',
    bg: 'bg-orange-400',
    bgLight: 'bg-orange-400/20',
    border: 'border-orange-400',
    text: 'text-orange-400',
    dot: 'bg-orange-400',
    bgHover: 'hover:bg-orange-400/90',
  },
  red: {
    label: 'Rood',
    bg: 'bg-red-400',
    bgLight: 'bg-red-400/20',
    border: 'border-red-400',
    text: 'text-red-400',
    dot: 'bg-red-400',
    bgHover: 'hover:bg-red-400/90',
  },
  teal: {
    label: 'Teal',
    bg: 'bg-teal-400',
    bgLight: 'bg-teal-400/20',
    border: 'border-teal-400',
    text: 'text-teal-400',
    dot: 'bg-teal-400',
    bgHover: 'hover:bg-teal-400/90',
  },
  yellow: {
    label: 'Geel',
    bg: 'bg-amber-400',
    bgLight: 'bg-amber-400/20',
    border: 'border-amber-400',
    text: 'text-amber-400',
    dot: 'bg-amber-400',
    bgHover: 'hover:bg-amber-400/90',
  },
}

/** Get color config for a user, with fallback to gray */
export function getUserColor(user) {
  if (!user?.color) return COLORS.blue
  return COLORS[user.color] || COLORS.blue
}

/** "Samen" (shared/both) styling — uses the existing pastel lavender */
export const BOTH_COLOR = {
  bg: 'bg-pastel-lavender',
  bgLight: 'bg-pastel-lavender',
  border: 'border-pastel-lavenderDark',
  text: 'text-pastel-lavenderDark',
  dot: 'bg-pastel-lavenderDark',
}

/** Day status color palette — dark pastel bg with white text for good contrast */
export const STATUS_COLORS = [
  { key: 'mint',     bg: 'bg-pastel-mintDark',     text: 'text-white', swatch: 'bg-pastel-mintDark' },
  { key: 'lavender', bg: 'bg-pastel-lavenderDark',  text: 'text-white', swatch: 'bg-pastel-lavenderDark' },
  { key: 'peach',    bg: 'bg-pastel-peachDark',     text: 'text-white', swatch: 'bg-pastel-peachDark' },
  { key: 'rose',     bg: 'bg-pastel-roseDark',      text: 'text-white', swatch: 'bg-pastel-roseDark' },
  { key: 'sky',      bg: 'bg-pastel-skyDark',       text: 'text-white', swatch: 'bg-pastel-skyDark' },
  { key: 'sage',     bg: 'bg-pastel-sageDark',      text: 'text-white', swatch: 'bg-pastel-sageDark' },
  { key: 'lilac',    bg: 'bg-pastel-lilacDark',     text: 'text-white', swatch: 'bg-pastel-lilacDark' },
]

export function getStatusColor(colorKey) {
  return STATUS_COLORS.find(c => c.key === colorKey) || STATUS_COLORS[0]
}
