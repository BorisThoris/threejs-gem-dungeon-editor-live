import React, { Suspense } from "react";
import StartScreen from "./components/StartScreen";
import { ThemeProvider } from "./themes";
import type { DevToolId } from "./dev/DevToolRoutes";
import "./App.css";

/**
 * Developer/authoring tools are gated behind `import.meta.env.DEV`.
 *
 * `import.meta.env.DEV` is statically replaced with `false` by Vite in a
 * production build, so the dynamic import below is unreachable and Rollup
 * drops the entire dev tooling graph (3D editor, room builder, texture
 * painter, mosaic creator, demos) from the shipped bundle.
 */
const DevToolRoutes = import.meta.env.DEV
  ? React.lazy(() => import("./dev/DevToolRoutes"))
  : null;

const DEV_TOOL_PARAMS: DevToolId[] = [
  "editor",
  "room-builder",
  "texture-painter",
  "mosaic-creator",
  "texture-painter-example",
  "url-test",
  "url-debug",
  "hand-demo",
];

function getActiveDevTool(): DevToolId | null {
  const urlParams = new URLSearchParams(window.location.search);
  for (const param of DEV_TOOL_PARAMS) {
    if (urlParams.get(param) === "true") {
      return param;
    }
  }
  return null;
}

function App() {
  // In production this is always null: the tools are unreachable for players.
  const activeDevTool = import.meta.env.DEV ? getActiveDevTool() : null;
  const showEditor = activeDevTool === "editor";

  // Add CSS class to root element for editor mode
  React.useEffect(() => {
    const rootElement = document.getElementById("root");
    const bodyElement = document.body;
    const htmlElement = document.documentElement;

    if (showEditor) {
      rootElement?.classList.add("editor-mode");
      bodyElement?.classList.add("editor-mode");
      htmlElement?.classList.add("editor-mode");
    } else {
      rootElement?.classList.remove("editor-mode");
      bodyElement?.classList.remove("editor-mode");
      htmlElement?.classList.remove("editor-mode");
    }
  }, [showEditor]);

  if (import.meta.env.DEV && DevToolRoutes && activeDevTool) {
    return (
      <ThemeProvider>
        <Suspense
          fallback={
            <div
              style={{
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#111",
                color: "#ccc",
                fontFamily: "sans-serif",
              }}
            >
              Loading developer tool…
            </div>
          }
        >
          <DevToolRoutes tool={activeDevTool} />
        </Suspense>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <StartScreen />
    </ThemeProvider>
  );
}

export default App;
