import React, { ComponentType } from "react";

type ScreenModule = { default: ComponentType<object> };

/** Defers `require()` until the screen is first opened — smaller initial Metro bundle. */
export function lazyScreen(loader: () => ScreenModule): ComponentType<object> {
  let Screen: ComponentType<object> | null = null;

  function LazyScreen(props: object) {
    if (!Screen) {
      Screen = loader().default;
    }
    return React.createElement(Screen, props);
  }

  LazyScreen.displayName = "LazyScreen";
  return LazyScreen;
}
