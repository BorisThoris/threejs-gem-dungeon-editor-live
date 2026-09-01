# Bundled fonts

## Liberation Sans (`LiberationSans-Regular.ttf`)

Shipped so that in-game text renders without any network access. Without a
bundled font, troika (used by `@react-three/drei`'s `<Text>`) resolves and
downloads a font from `cdn.jsdelivr.net` at runtime, which fails in an offline
or packaged build.

- Upstream: https://github.com/liberationfonts
- Copyright (c) 2012 Red Hat, Inc. with Reserved Font Name "Liberation"
- Digitized data copyright (c) 2010 Google Corporation with Reserved Font Name
  "Arimo", "Tinos" and "Cousine"
- License: SIL Open Font License, Version 1.1 (with the upstream GPL v2 +
  font-exception terms for the packaging), reproduced in full in
  `LiberationSans-LICENSE.txt` in this directory.

The OFL permits bundling and redistribution with software, including
commercial software, provided the reserved font names are not used by
derivative works and the license text travels with the font - hence this file
and `LiberationSans-LICENSE.txt`.
