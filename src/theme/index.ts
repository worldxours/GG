// GoodGame design system — neomorphic dark theme
// Mirrors the CSS variables in runit_prototype.html

export const Colors = {
  bg: '#0e1015',
  raised: '#161920',
  border: '#1e2330',
  // Shadows
  shadowDark: '#070a0f',
  shadowLight: '#1e2535',
  // Accent — default (no team theme)
  c1: '#8b5cf6',   // purple
  c2: '#3b82f6',   // blue
  glowSoft: 'rgba(139,92,246,0.15)',
  glowMid: 'rgba(139,92,246,0.35)',
  // Text
  text: '#e8eaf0',
  dim: '#8892a4',
  muted: '#4a5568',
  divider: '#1e2330',
  // Button
  btn: '#8b5cf6',
  btnShadow: 'rgba(139,92,246,0.4)',
  btnText: '#ffffff',
  // Status
  win: '#22c55e',
  loss: '#ef4444',
  pending: '#f59e0b',
  live: '#22c55e',
} as const;

export const Typography = {
  heading: 'Syne_800ExtraBold',
  headingBold: 'Syne_700Bold',
  body: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
} as const;

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   20,   // screen horizontal padding (prototype uses 20px, not 24px)
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const;

export const Radius = {
  xs:      8,    // status badges, small pills
  sm:      10,   // avatar sm
  md:      14,   // secondary buttons, chips, avatar md
  input:   16,   // input fields
  lg:      18,   // avatar lg
  card:    22,   // standard card (most cards in prototype)
  xl:      24,   // large cards (balance, preview)
  nav:     26,   // bottom nav pill container
  fab:     17,   // FAB button (square-ish, NOT a circle)
  sheet:   28,   // bottom sheet top corners
  profile: 22,   // profile avatar (72x72)
  full:    9999,
} as const;

// Neomorphic shadow helper (raised surface)
export const neomorphShadow = {
  shadowColor: Colors.shadowDark,
  shadowOffset: { width: -3, height: -3 },
  shadowOpacity: 1,
  shadowRadius: 6,
  elevation: 4,
};

// Neomorphic inset (pressed/active state)
export const neomorphInset = {
  shadowColor: Colors.shadowDark,
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 0.8,
  shadowRadius: 4,
  elevation: 0,
};
