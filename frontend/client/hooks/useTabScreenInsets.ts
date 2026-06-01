import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Spacing } from "@/constants/theme";
import { FAB_CLEARANCE } from "@/constants/layout";

/**
 * Consistent scroll padding for screens inside the main tab navigator.
 * Clears header, tab bar, and floating import button.
 */
export function useTabScreenInsets(options?: { includeFab?: boolean }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const includeFab = options?.includeFab !== false;

  const bottomPad =
    tabBarHeight +
    Spacing.xl +
    (includeFab ? FAB_CLEARANCE : Spacing.md);

  return {
    paddingTop: headerHeight + Spacing.lg,
    paddingBottom: bottomPad,
    paddingHorizontal: Spacing.lg,
    scrollIndicatorBottom: insets.bottom + tabBarHeight,
  };
}

/** Stack/modal screens (no tab bar) */
export function useStackScreenInsets() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return {
    paddingTop: Spacing.lg,
    paddingBottom: insets.bottom + Spacing.xl,
    paddingHorizontal: Spacing.lg,
    scrollIndicatorBottom: insets.bottom,
    headerHeight,
  };
}
