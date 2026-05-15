import React from "react";
import StartScreen from "./components/StartScreen";
import ThreeDEditor from "./components/ThreeDEditor";
import RoomBuilderPage from "./pages/RoomBuilderPage";
import TexturePainterLauncher from "./components/TexturePainterLauncher";
import MosaicCreatorLauncher from "./components/MosaicCreatorLauncher";
import TexturePainterExample from "./components/TexturePainterExample";
import URLParamTest from "./components/URLParamTest";
import URLDebugTest from "./components/URLDebugTest";
import HandDemo from "./components/HandDemo";
import { ThemeProvider } from "./themes";
import "./App.css";

function App() {
  // Check URL parameter to show editor or texture painter
  const urlParams = new URLSearchParams(window.location.search);
  const showEditor = urlParams.get("editor") === "true";
  const showRoomBuilder = urlParams.get("room-builder") === "true";
  const showTexturePainter = urlParams.get("texture-painter") === "true";
  const showMosaicCreator = urlParams.get("mosaic-creator") === "true";
  const showTexturePainterExample =
    urlParams.get("texture-painter-example") === "true";
  const showURLParamTest = urlParams.get("url-test") === "true";
  const showURLDebugTest = urlParams.get("url-debug") === "true";
  const showHandDemo = urlParams.get("hand-demo") === "true";

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

  if (showEditor) {
    return (
      <ThemeProvider>
        <ThreeDEditor />
      </ThemeProvider>
    );
  }

  if (showRoomBuilder) {
    return (
      <ThemeProvider>
        <RoomBuilderPage />
      </ThemeProvider>
    );
  }

  if (showTexturePainter) {
    return (
      <ThemeProvider>
        <TexturePainterLauncher />
      </ThemeProvider>
    );
  }

  if (showMosaicCreator) {
    return (
      <ThemeProvider>
        <MosaicCreatorLauncher />
      </ThemeProvider>
    );
  }

  if (showTexturePainterExample) {
    return (
      <ThemeProvider>
        <TexturePainterExample />
      </ThemeProvider>
    );
  }

  if (showURLParamTest) {
    return (
      <ThemeProvider>
        <URLParamTest />
      </ThemeProvider>
    );
  }

  if (showURLDebugTest) {
    return (
      <ThemeProvider>
        <URLDebugTest />
      </ThemeProvider>
    );
  }

  if (showHandDemo) {
    return (
      <ThemeProvider>
        <HandDemo />
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
