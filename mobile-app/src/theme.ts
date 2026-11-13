/**
 * Central visual theme for Rutin: warm cream surfaces, terracotta accent, dark brown text.
 * Every screen, sheet and dialog reads its colors, spacing, radii and type sizes from here so
 * the app stays visually consistent. Only the visual layer depends on this file.
 */

const PALETTE = {
  // Surfaces
  bg: '#FFF7EB', // page background, light cream
  surface: '#FFFCF6', // primary cards
  surfaceAlt: '#F8E5D6', // secondary cards, light peach
  surfaceMuted: '#FBF0E3', // chips, inner boxes, pressed rows

  // Text and icons
  text: '#35271F',
  textSecondary: '#796454',
  textMuted: '#9A8473', // placeholders, de-emphasised meta text
  onAccent: '#FFFFFF',

  // Lines
  border: '#ECD8C7',
  borderStrong: '#DCC3AE',

  // Brand accent (logo, selected day, progress, primary action, active tab)
  accent: '#CD5336',
  accentPressed: '#B4452B',
  accentSoft: '#F8E5D6',
  accentBorder: '#EDC3B3',

  // Status
  success: '#4B876A',
  successSoft: '#E5F0E8',
  successBorder: '#C3DCCB',
  warning: '#8B5014',
  warningSoft: '#FAECD7',
  warningBorder: '#EDD3AC',
  amber: '#D49537', // small indicators (dots, bars) where the dark warning brown reads as black
  danger: '#B3392B',
  dangerSoft: '#F9E3DE',
  dangerBorder: '#EEC3BA',
  info: '#3F6E7D',
  infoSoft: '#E4EEF0',
  infoBorder: '#C3D8DD',
  purple: '#7A5A8C',
  purpleSoft: '#F0E8F2',
  purpleBorder: '#DCCBE3',

  // Effects
  overlay: 'rgba(53, 39, 31, 0.45)',
  shadow: '#5A3A24',
  switchTrackOff: '#E3D0BF',
} as const;

export type ColorToken = keyof typeof PALETTE;

/** Widened to string so a token can be stored in a variable and reassigned to another token. */
export const COLORS: Readonly<Record<ColorToken, string>> = PALETTE;

/** Spacing scale in dp. Page gutter 20, card padding 16, gaps 8–16. */
export const SPACING = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  page: 20,
  card: 16,
} as const;

export const RADII = {
  sm: 8,
  button: 12,
  card: 16,
  pill: 999,
} as const;

/** Type sizes in sp. One system font family across the app. */
export const TYPE = {
  display: 28, // screen titles, hero dose time
  title: 20, // medicine name on primary card
  heading: 17,
  body: 15,
  bodySmall: 14,
  caption: 12,
  micro: 11,
} as const;

/** Minimum touch target in dp (Material / HIG accessibility guidance). */
export const MIN_TOUCH = 48;

/** One soft, low elevation for floating chrome; no heavy shadows on cards. */
export const ELEVATION = {
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;
