import { Suspense } from "react";
import { Text as DreiText } from "@react-three/drei";
import type { ComponentProps } from "react";

type TextProps = ComponentProps<typeof DreiText>;

/**
 * The font troika renders every label with.
 *
 * Left to itself, troika has no font at all: it asks lojjic's
 * unicode-font-resolver over the network (cdn.jsdelivr.net) which font covers
 * the characters in the string, then downloads that font. A packaged Steam
 * build has no guarantee of internet, and when that fetch fails troika throws
 * from `getFontsForString` and the label simply never appears - silently,
 * because each label sits behind its own Suspense boundary (see below).
 *
 * Pointing `font` at a file we ship removes the network from the path
 * entirely: troika loads it over the page's own origin (the dev server, or
 * file:// inside Electron) and resolves every covered character against it
 * without ever consulting the CDN.
 *
 * The URL is relative on purpose. Vite is configured with `base: './'` and
 * package.json sets `"homepage": "./"` because Electron loads the built app
 * from disk as `file://.../dist/index.html`; a root-absolute `/fonts/...`
 * would resolve to the filesystem root there and 404. `./fonts/...` resolves
 * against the document, which is correct in both `yarn dev` and the packaged
 * app - the same convention `StartScreen` uses for `./night.hdr`.
 */
const GAME_FONT_URL = "./fonts/LiberationSans-Regular.ttf";

/**
 * drei's <Text> with its own Suspense boundary and a bundled font.
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
  // font first so an individual call site can still override it.
  return (
    <Suspense fallback={null}>
      <DreiText font={GAME_FONT_URL} {...props} />
    </Suspense>
  );
}

export default Text;
