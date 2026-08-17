import { Verdict } from './types';

export const colors = {
  bg: '#FBF7F0',
  bgDeep: '#F3ECE0',
  card: '#FFFFFF',
  border: '#EAE0D2',
  text: '#2A2521',
  muted: '#7C7166',
  accent: '#3D7A5A',
  accentSoft: '#E7F0EA',
  overlay: 'rgba(28, 24, 20, 0.55)',
  onDark: '#FFFFFF',
  onDarkMuted: 'rgba(255, 255, 255, 0.72)',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const fonts = {
  /** Talpas címbetű – a költségkövetővel közös „családi" jegy. */
  display: 'PlayfairDisplay_700Bold',
  displayMedium: 'PlayfairDisplay_600SemiBold',
};

export type VerdictStyle = {
  /** Rövid, egyértelmű fejléc. Szándékosan nem „Biztonságos": az adat közösségi. */
  title: string;
  emoji: string;
  fg: string;
  bg: string;
  border: string;
};

export const verdictStyles: Record<Verdict, VerdictStyle> = {
  safe: {
    title: 'Valószínűleg mentes',
    emoji: '✓',
    fg: '#1F6B45',
    bg: '#E8F3EC',
    border: '#BFDCCB',
  },
  caution: {
    title: 'Óvatosan',
    emoji: '!',
    fg: '#8A5A00',
    bg: '#FBF0DC',
    border: '#E6CE9B',
  },
  unknown: {
    title: 'Nincs elég adat',
    emoji: '?',
    fg: '#4A5460',
    bg: '#EDEFF2',
    border: '#CFD5DD',
  },
  unsafe: {
    title: 'Nem mentes',
    emoji: '×',
    fg: '#A02D1E',
    bg: '#FBE9E6',
    border: '#EEC3BB',
  },
};
