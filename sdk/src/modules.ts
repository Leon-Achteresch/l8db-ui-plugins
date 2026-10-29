import { checkPluginElement } from "./elements";
import { markPluginError } from "./errors";

export const REACT_EXPORTS = [
  "Children",
  "Fragment",
  "createContext",
  "isValidElement",
  "memo",
  "startTransition",
  "useCallback",
  "useContext",
  "useDeferredValue",
  "useEffect",
  "useId",
  "useMemo",
  "useReducer",
  "useRef",
  "useState",
  "useTransition",
] as const;

type Render = (type: unknown, props: unknown, key?: unknown) => unknown;
type Component = ((props: unknown) => unknown) & { displayName?: string };

const guarded = new WeakMap<Component, Component>();

function guard(type: unknown) {
  if (
    typeof type !== "function" ||
    (type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent
  )
    return type;
  const component = type as Component;
  let wrapper = guarded.get(component);
  if (!wrapper) {
    wrapper = (props: unknown) => {
      try {
        return component(props);
      } catch (error) {
        throw markPluginError(error);
      }
    };
    wrapper.displayName = component.displayName || component.name;
    guarded.set(component, wrapper);
  }
  return wrapper;
}

export function createPluginModules(
  react: object,
  runtime: { Fragment: unknown; jsx: unknown; jsxs: unknown },
  sdk: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const source = react as Record<string, unknown>;
  const checked =
    (render: Render): Render =>
    (type, props, key) => {
      checkPluginElement(type, props);
      return render(guard(type), props, key);
    };
  return Object.freeze({
    react: Object.freeze({
      ...Object.fromEntries(REACT_EXPORTS.map((name) => [name, source[name]])),
      memo: (type: unknown, compare?: unknown) => (source.memo as Render)(guard(type), compare),
    }),
    "react/jsx-runtime": Object.freeze({
      Fragment: runtime.Fragment,
      jsx: checked(runtime.jsx as Render),
      jsxs: checked(runtime.jsxs as Render),
    }),
    "@l8db/ui": Object.freeze({ ...sdk }),
  });
}
