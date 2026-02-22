import { TextStyle } from 'react-native';

// Font families — loaded via expo-font / @expo-google-fonts
// Fallback to system fonts if not loaded yet
export const fonts = {
  outfit: 'Outfit',
  jakarta: 'PlusJakartaSans',
  // Fallbacks for before fonts load
  outfitFallback: 'System',
  jakartaFallback: 'System',
};

// Display — Outfit (for KES amounts and numerals)
export const typography: Record<string, TextStyle> = {
  displayXl: { fontFamily: 'System', fontSize: 44, fontWeight: '700', letterSpacing: -2 },
  displayLg: { fontFamily: 'System', fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  displayMd: { fontFamily: 'System', fontSize: 24, fontWeight: '700', letterSpacing: -0.9 },
  displaySm: { fontFamily: 'System', fontSize: 20, fontWeight: '600', letterSpacing: -0.6 },
  displayXs: { fontFamily: 'System', fontSize: 15, fontWeight: '700', letterSpacing: -0.4 },
  mono: { fontFamily: 'System', fontSize: 13, fontWeight: '600', letterSpacing: -0.2 },

  // Headings — Outfit
  h1: { fontFamily: 'System', fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  h2: { fontFamily: 'System', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  h3: { fontFamily: 'System', fontSize: 18, fontWeight: '700', letterSpacing: -0.4 },
  h4: { fontFamily: 'System', fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },

  // Body — Plus Jakarta Sans
  bodyLg: { fontFamily: 'System', fontSize: 15, fontWeight: '400' },
  bodyMd: { fontFamily: 'System', fontSize: 14, fontWeight: '400' },
  bodySm: { fontFamily: 'System', fontSize: 13, fontWeight: '400' },
  bodyXs: { fontFamily: 'System', fontSize: 12, fontWeight: '400' },

  // Labels — Plus Jakarta Sans
  labelLg: { fontFamily: 'System', fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  labelMd: { fontFamily: 'System', fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  labelSm: { fontFamily: 'System', fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  labelXs: { fontFamily: 'System', fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },

  // Eyebrow/Caps — Plus Jakarta Sans
  caps: { fontFamily: 'System', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  capsSm: { fontFamily: 'System', fontSize: 10, fontWeight: '500', letterSpacing: 0.6, textTransform: 'uppercase' },
  capsXs: { fontFamily: 'System', fontSize: 9.5, fontWeight: '500', letterSpacing: 0.5, textTransform: 'uppercase' },

  // Nav
  navLabel: { fontFamily: 'System', fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
};
