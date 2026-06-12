import { Platform } from "react-native";

/** Brand background from official logo artwork */
export const BRAND_BLACK = "#000000";
export const BRAND_BG = BRAND_BLACK;
/** @deprecated use BRAND_BLACK */
export const BRAND_NAVY = BRAND_BLACK;

export const Colors = {
  light: {
    text: "#111B21",
    textSecondary: "#667781",
    buttonText: "#FFFFFF",
    tabIconDefault: "#667781",
    tabIconSelected: "#00A884",
    link: "#00A884",
    primary: "#00A884",
    primaryVariant: "#008069",
    headerBackground: "#008069",
    headerForeground: "#FFFFFF",
    headerForegroundMuted: "rgba(255,255,255,0.75)",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F0F2F5",
    backgroundSecondary: "#E9EDEF",
    backgroundTertiary: "#D1D7DB",
    surfaceElevated: "#FFFFFF",
    chatBubbleSent: "#D9FDD3",
    chatBubbleReceived: "#FFFFFF",
    chatWallpaper: "#E5DDD5",
    error: "#EA0038",
    warning: "#FF9500",
    success: "#00A884",
    categoryImportant: "#EA0038",
    categoryActionable: "#FF9500",
    categoryGeneral: "#667781",
    categoryBusiness: "#00A884",
    categoryUrgent: "#EA0038",
    priorityUrgent: "#EA0038",
    priorityModerate: "#FF9500",
    priorityLow: "#00A884",
    border: "#E9EDEF",
    divider: "#E9EDEF",
    onPrimary: "#FFFFFF",
    onAccent: "#FFFFFF",
    overlay: "rgba(0,0,0,0.45)",
  },
  dark: {
    text: "#E9EDEF",
    textSecondary: "#8696A0",
    buttonText: "#111B21",
    tabIconDefault: "#8696A0",
    tabIconSelected: "#00A884",
    link: "#00A884",
    primary: "#00A884",
    primaryVariant: "#008069",
    headerBackground: "#1F2C34",
    headerForeground: "#E9EDEF",
    headerForegroundMuted: "rgba(233,237,239,0.7)",
    backgroundRoot: "#0B141A",
    backgroundDefault: "#111B21",
    backgroundSecondary: "#1F2C34",
    backgroundTertiary: "#2A3942",
    surfaceElevated: "#1F2C34",
    chatBubbleSent: "#005C4B",
    chatBubbleReceived: "#1F2C34",
    chatWallpaper: "#0B141A",
    error: "#F15C6D",
    warning: "#FF9500",
    success: "#00A884",
    categoryImportant: "#F15C6D",
    categoryActionable: "#FF9500",
    categoryGeneral: "#8696A0",
    categoryBusiness: "#00A884",
    categoryUrgent: "#F15C6D",
    priorityUrgent: "#F15C6D",
    priorityModerate: "#FF9500",
    priorityLow: "#00A884",
    border: "#2A3942",
    divider: "#2A3942",
    onPrimary: "#111B21",
    onAccent: "#FFFFFF",
    overlay: "rgba(0,0,0,0.6)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  "2xl": 28,
  "3xl": 50,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const Typography = {
  h1: { fontSize: 32, fontWeight: "700" as const, letterSpacing: -0.5 },
  h2: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 22, fontWeight: "600" as const },
  h4: { fontSize: 17, fontWeight: "600" as const },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 16 },
  link: { fontSize: 15, fontWeight: "500" as const },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.4, textTransform: "uppercase" as const },
};

export const Fonts = Platform.select({
  ios: { sans: "System", serif: "Georgia", rounded: "System", mono: "Menlo" },
  default: { sans: "normal", serif: "serif", rounded: "normal", mono: "monospace" },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, serif",
    rounded: "'SF Pro Rounded', sans-serif",
    mono: "Menlo, Monaco, Consolas, monospace",
  },
});
