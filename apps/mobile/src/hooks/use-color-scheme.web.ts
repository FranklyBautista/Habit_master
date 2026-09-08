import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // useSyncExternalStore's snapshot pair reports "not hydrated yet" on the
  // server/first static render and "hydrated" once mounted on the client,
  // without the cascading re-render an effect-driven setState would cause.
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return "light";
}
