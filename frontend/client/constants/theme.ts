import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#000000",
    textSecondary: "#667781",
    buttonText: "#FFFFFF",
    tabIconDefault: "#667781",
    tabIconSelected: "#25D366",
    link: "#25D366",
    primary: "#25D366",
    primaryVariant: "#128C7E",
    backgroundRoot: "#FFFFFF",
    backgroundDefault: "#F0F0F0",
    backgroundSecondary: "#E6E6E6",
    backgroundTertiary: "#D9D9D9",
    chatBubbleSent: "#DCF8C6",
    chatBubbleReceived: "#FFFFFF",
    error: "#E53935",
    warning: "#FFA726",
    success: "#25D366",
    categoryImportant: "#E53935",
    categoryActionable: "#FFA726",
    categoryGeneral: "#667781",
    categoryBusiness: "#25D366",
    categoryUrgent: "#D32F2F",
    border: "#E0E0E0",
  },
  dark: {
    text: "#E9EDEF",
    textSecondary: "#8696A0",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8696A0",
    tabIconSelected: "#25D366",
    link: "#25D366",
    primary: "#25D366",
    primaryVariant: "#128C7E",
    backgroundRoot: "#0B141A",
    backgroundDefault: "#1F2C34",
    backgroundSecondary: "#2A3942",
    backgroundTertiary: "#354550",
    chatBubbleSent: "#005C4B",
    chatBubbleReceived: "#1F2C34",
    error: "#E53935",
    warning: "#FFA726",
    success: "#25D366",
    categoryImportant: "#E53935",
    categoryActionable: "#FFA726",
    categoryGeneral: "#8696A0",
    categoryBusiness: "#25D366",
    categoryUrgent: "#D32F2F",
    border: "#2A3942",
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
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
