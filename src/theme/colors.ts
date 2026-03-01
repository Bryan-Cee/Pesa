export const darkColors = {
  // Surfaces
  bg: '#09090E',
  bgCard: '#141420',
  bgRaised: '#1A1A28',
  bgSheet: '#111118',
  bgHover: '#1F1F30',

  // Borders
  border: 'rgba(255,255,255,0.055)',
  borderMed: 'rgba(255,255,255,0.09)',
  borderFocus: 'rgba(252,76,2,0.45)',

  // Primary accent (Strava Orange)
  coral: '#FC4C02',
  coralLight: '#FF7340',
  coralDim: 'rgba(252,76,2,0.12)',
  coralGlow: 'rgba(252,76,2,0.22)',
  coralBorder: 'rgba(252,76,2,0.35)',
  coralShadow: '0 8px 24px rgba(252,76,2,0.3)',
  buttonText: '#FFFFFF',

  // Subtle overlays (for tracks, inactive chips, faint backgrounds)
  subtle: 'rgba(255,255,255,0.03)',
  subtleMed: 'rgba(255,255,255,0.06)',

  // Category group accents
  debtRed: '#F97048',
  savingsGreen: '#34D399',
  investBlue: '#60A5FA',
  householdCoral: '#FC4C02',
  vehicleTeal: '#2DD4BF',
  subsPurple: '#A78BFA',
  entertAmber: '#FBBF24',
  travelSky: '#38BDF8',
  charityPink: '#F472B6',
  healthEmerald: '#6EE7B7',
  customGrey: '#94A3B8',

  // Category dim backgrounds
  debtRedDim: 'rgba(249,112,72,0.10)',
  savingsGreenDim: 'rgba(52,211,153,0.10)',
  investBlueDim: 'rgba(96,165,250,0.10)',
  householdCoralDim: 'rgba(252,76,2,0.10)',
  vehicleTealDim: 'rgba(45,212,191,0.10)',
  subsPurpleDim: 'rgba(167,139,250,0.10)',
  entertAmberDim: 'rgba(251,191,36,0.10)',
  travelSkyDim: 'rgba(56,189,248,0.10)',
  charityPinkDim: 'rgba(244,114,182,0.10)',
  healthEmeraldDim: 'rgba(110,231,183,0.10)',
  customGreyDim: 'rgba(148,163,184,0.10)',

  // Status
  green: '#34D399',
  greenDim: 'rgba(52,211,153,0.10)',
  red: '#EF4444',
  redDim: 'rgba(239,68,68,0.10)',
  amber: '#FBBF24',
  amberDim: 'rgba(251,191,36,0.10)',
  purple: '#A78BFA',
  purpleDim: 'rgba(167,139,250,0.10)',

  // Text
  t1: '#EEEEF5',
  t2: '#8888A8',
  t3: '#484860',

  // Legacy
  white: '#EEEEF5',
  black: '#09090E',
};

export const lightColors: typeof darkColors = {
  // Surfaces
  bg: '#F5F5F8',
  bgCard: '#FFFFFF',
  bgRaised: '#F0F0F5',
  bgSheet: '#FFFFFF',
  bgHover: '#EAEAF0',

  // Borders
  border: 'rgba(0,0,0,0.08)',
  borderMed: 'rgba(0,0,0,0.12)',
  borderFocus: 'rgba(232,61,0,0.45)',

  // Primary accent (Strava Orange — darkened for light bg)
  coral: '#E83D00',
  coralLight: '#FC4C02',
  coralDim: 'rgba(232,61,0,0.10)',
  coralGlow: 'rgba(232,61,0,0.15)',
  coralBorder: 'rgba(232,61,0,0.3)',
  coralShadow: '0 8px 24px rgba(232,61,0,0.2)',
  buttonText: '#FFFFFF',

  // Subtle overlays (for tracks, inactive chips, faint backgrounds)
  subtle: 'rgba(0,0,0,0.03)',
  subtleMed: 'rgba(0,0,0,0.05)',

  // Category group accents
  debtRed: '#E8613D',
  savingsGreen: '#1A9A6B',
  investBlue: '#3B82F6',
  householdCoral: '#E83D00',
  vehicleTeal: '#0D9488',
  subsPurple: '#7C3AED',
  entertAmber: '#D97706',
  travelSky: '#0284C7',
  charityPink: '#DB2777',
  healthEmerald: '#059669',
  customGrey: '#64748B',

  // Category dim backgrounds
  debtRedDim: 'rgba(232,97,61,0.08)',
  savingsGreenDim: 'rgba(26,154,107,0.08)',
  investBlueDim: 'rgba(59,130,246,0.08)',
  householdCoralDim: 'rgba(232,61,0,0.08)',
  vehicleTealDim: 'rgba(13,148,136,0.08)',
  subsPurpleDim: 'rgba(124,58,237,0.08)',
  entertAmberDim: 'rgba(217,119,6,0.08)',
  travelSkyDim: 'rgba(2,132,199,0.08)',
  charityPinkDim: 'rgba(219,39,119,0.08)',
  healthEmeraldDim: 'rgba(5,150,105,0.08)',
  customGreyDim: 'rgba(100,116,139,0.08)',

  // Status
  green: '#1A9A4E',
  greenDim: 'rgba(26,154,78,0.08)',
  red: '#DC2626',
  redDim: 'rgba(220,38,38,0.08)',
  amber: '#D97706',
  amberDim: 'rgba(217,119,6,0.08)',
  purple: '#7C3AED',
  purpleDim: 'rgba(124,58,237,0.08)',

  // Text
  t1: '#111827',
  t2: '#6B7280',
  t3: '#9CA3AF',

  // Legacy
  white: '#FFFFFF',
  black: '#111827',
};

export type ThemeColors = typeof darkColors;

// Static default for StyleSheet.create — dark theme
// Components that need dynamic theming use useColors() hook instead
export const colors = darkColors;
