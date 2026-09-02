/**
 * MojAuto design tokens — "instrument cluster": warm near-black ground,
 * signal orange, monospace numerals. Deliberately not the blue-slate /
 * soft-rounded-card look most dark app UIs default to.
 */

export const Colors = {
  background: "#0C0A08",
  backgroundElevated: "#0F0C09",
  surface: "#17130F",
  surfaceRaised: "#201A13",
  line: "rgba(243, 237, 228, 0.09)",
  lineStrong: "rgba(243, 237, 228, 0.16)",

  accent: "#FF5A1F",
  accentBright: "#FFB347",
  accentDeep: "#8A2E0A",
  accentWash: "#241209",

  success: "#7FB069",
  successWash: "#1A2416",
  warning: "#E8B339",
  warningWash: "#241C0C",
  danger: "#E1483C",
  dangerWash: "#26120F",

  textPrimary: "#F3EDE4",
  textSecondary: "#9C8F80",
  textTertiary: "#5F564A",

  overlay: "rgba(8, 6, 4, 0.75)",
  white: "#FFFFFF",
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 2,
  md: 3,
  lg: 4,
  xl: 6,
  full: 999,
} as const;

export const FontFamily = {
  body: "WorkSans_400Regular",
  bodyMedium: "WorkSans_500Medium",
  bodySemiBold: "WorkSans_600SemiBold",
  display: "BigShouldersDisplay_700Bold",
  displayBlack: "BigShouldersDisplay_800ExtraBold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
} as const;

export const Typography = {
  display: {
    fontFamily: FontFamily.displayBlack,
    fontSize: 36,
    lineHeight: 38,
    textTransform: "uppercase" as const,
    letterSpacing: 0.2,
  },
  h1: {
    fontFamily: FontFamily.display,
    fontSize: 27,
    lineHeight: 29,
    textTransform: "uppercase" as const,
    letterSpacing: 0.2,
  },
  h2: {
    fontFamily: FontFamily.display,
    fontSize: 21,
    lineHeight: 23,
    textTransform: "uppercase" as const,
    letterSpacing: 0.2,
  },
  h3: {
    fontFamily: FontFamily.display,
    fontSize: 17,
    lineHeight: 19,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  statLarge: {
    fontFamily: FontFamily.monoBold,
    fontSize: 30,
    lineHeight: 34,
  },
  statMedium: {
    fontFamily: FontFamily.monoBold,
    fontSize: 18,
    lineHeight: 22,
  },
  body: { fontFamily: FontFamily.body, fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: FontFamily.bodyMedium, fontSize: 15, lineHeight: 21 },
  eyebrow: {
    fontFamily: FontFamily.mono,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
  caption: { fontFamily: FontFamily.body, fontSize: 12, lineHeight: 16 },
  tag: {
    fontFamily: FontFamily.mono,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  button: {
    fontFamily: FontFamily.monoMedium,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
} as const;

export const Shadow = {
  floating: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;
