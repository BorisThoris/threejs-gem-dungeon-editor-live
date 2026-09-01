import { Suspense } from "react";
import { Text as DreiText } from "@react-three/drei";
import type { ComponentProps } from "react";

type TextProps = ComponentProps<typeof DreiText>;

/**
 * drei's <Text> with its own Suspense boundary.
 *
 * troika loads and compiles a font before it can render a label, and while that
 * is pending the component suspends. Every room, door and sign in this game
 * draws text, so a single unresolved font took down the nearest Suspense
 * boundary - which is the one wrapping the entire room, including its floor
 * colliders and the room's frame loop. The room never mounted, physics never
 * ran there, and nothing reported an error.
 *
 * Wrapping each label in its own boundary means a slow or failed font costs
 * that one label and nothing else: the room, its colliders and its gameplay
 * mount immediately and the text pops in when it is ready.
 */
export function Text(props: TextProps) {
  return (
    <Suspense fallback={null}>
      <DreiText {...props} />
    </Suspense>
  );
}

export default Text;
