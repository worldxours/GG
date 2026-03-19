/**
 * ThemeContext — dynamic accent colour driven by the user's team theme setting.
 *
 * ThemeProvider reads userDoc.teamTheme from AuthContext and exposes a single
 * `accent` string via useTheme(). Components replace hard-coded Colors.c1
 * references with this value so the whole UI shifts colour when the user picks
 * their team.
 *
 * Must be rendered INSIDE <AuthProvider> (it calls useAuth internally).
 */

import React, { createContext, useContext } from 'react';
import { Colors } from '../theme';
import { useAuth } from './AuthContext';
import { TeamTheme } from '../types';

// ── Team accent colours ───────────────────────────────────────────────────────
// One punchy accent per team — chosen to pop against the dark neomorphic bg.
export const TEAM_COLORS: Record<TeamTheme, string> = {
  knicks:  '#f58426',  // Knicks orange
  canucks: '#00b4d8',  // Canucks aqua
  flames:  '#ff4713',  // Flames orange-red
  raiders: '#a5acaf',  // Raiders silver
  eagles:  '#69be28',  // Eagles Kelly green
  '49ers': '#e31837',  // 49ers scarlet
};

// ── Team display labels (for the picker UI) ───────────────────────────────────
export const TEAM_LABELS: Record<TeamTheme, string> = {
  knicks:  'Knicks',
  canucks: 'Canucks',
  flames:  'Flames',
  raiders: 'Raiders',
  eagles:  'Eagles',
  '49ers': '49ers',
};

const DEFAULT_ACCENT = Colors.c1; // purple — no team selected

// ── Context ───────────────────────────────────────────────────────────────────
interface ThemeContextValue {
  accent: string;
}

const ThemeContext = createContext<ThemeContextValue>({ accent: DEFAULT_ACCENT });

// ── Provider ──────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { userDoc } = useAuth();
  const accent =
    (userDoc?.teamTheme ? TEAM_COLORS[userDoc.teamTheme] : null) ?? DEFAULT_ACCENT;

  return (
    <ThemeContext.Provider value={{ accent }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
