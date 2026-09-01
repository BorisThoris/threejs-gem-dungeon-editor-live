import { Children, Suspense, useMemo } from "react";
import { Text as DreiText } from "@react-three/drei";
import type { ComponentProps, ReactNode } from "react";
import { fontCovers } from "./gameFontCoverage";

type TextProps = ComponentProps<typeof DreiText>;

/**
 * The font troika renders every label with.
 *
 * Left to itself troika has no font at all: it asks lojjic's
 * unicode-font-resolver over the network (cdn.jsdelivr.net) which font covers
 * the characters in the string, then downloads that font. A packaged Steam
 * build has no guarantee of internet, and when that fetch fails troika throws
 * from `getFontsForString` and the label simply never appears - silently,
 * because each label sits behind its own Suspense boundary (see below).
 *
 * Pointing `font` at a file we ship removes the network from that path: troika
 * loads it from the page's own origin - the dev server, or file:// inside
 * Electron - and resolves every covered character against it.
 *
 * The URL is relative on purpose. Vite is configured with `base: './'` and
 * package.json sets `"homepage": "./"` because Electron loads the built app
 * from disk as `file://.../dist/index.html`; a root-absolute `/fonts/...`
 * would resolve against the filesystem root there and 404. `./fonts/...`
 * resolves against the document, which is correct both in `yarn dev` and in
 * the packaged app - the same convention StartScreen uses for `./night.hdr`.
 */
const GAME_FONT_URL = "./fonts/LiberationSans-Regular.ttf";

/**
 * Drop characters the bundled font cannot draw.
 *
 * Setting `font` is necessary but not sufficient. troika still consults the
 * CDN-hosted unicode-font-resolver for any single character the given font has
 * no glyph for, and there is no option to turn that off - so one emoji in a
 * label ("[door emoji] armory", "[rocket] START ROOM [rocket]") puts the CDN
 * back in the loop for that label on every sync. Offline that request fails;
 * online it is a round trip we do not want either.
 *
 * Those characters were never going to render from a Latin font, so they are
 * removed before troika sees them and the resolver is never asked. Whitespace
 * is always kept - troika resolves it against the preceding character, and
 * stripping it would collapse multi-line labels onto one line. Strings that
 * are fully covered are passed through untouched.
 */
function stripUnrenderable(text: string): string {
  let clean = "";
  let changed = false;
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    if (fontCovers(codePoint) || /\s/.test(char)) {
      clean += char;
    } else {
      changed = true;
    }
  }
  if (!changed) return text;
  // Removing a leading/trailing emoji otherwise leaves the label padded and
  // visibly off-centre, and a leading newline is the one whitespace troika
  // cannot resolve against a previous character.
  return clean.replace(/ {2,}/g, " ").trim();
}

function sanitizeChildren(children: ReactNode): ReactNode {
  let touched = false;
  const sanitized = Children.map(children, (child) => {
    if (typeof child !== "string") return child;
    const clean = stripUnrenderable(child);
    if (clean !== child) touched = true;
    return clean;
  });
  return touched ? sanitized : children;
}

/**
 * drei's <Text> with its own Suspense boundary and a bundled, offline font.
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
export function Text({ children, ...props }: TextProps) {
  const safeChildren = useMemo(() => sanitizeChildren(children), [children]);

  // font goes first so an individual call site can still override it.
  return (
    <Suspense fallback={null}>
      <DreiText font={GAME_FONT_URL} {...props}>
        {safeChildren}
      </DreiText>
    </Suspense>
  );
}

export default Text;
