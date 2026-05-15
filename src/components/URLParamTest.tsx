import React from "react";
import {
  useURLParams,
  parseCameraPosition,
  serializeCameraPosition,
  parseBoolean,
  parseJSON,
  serializeJSON,
} from "../hooks/useURLParams";

const URLParamTest: React.FC = () => {
  const { urlParams, updateURL, getParam, clearAllParams } = useURLParams();

  const testCameraPosition: [number, number, number] = [15, 20, 25];
  const testProps = { testProp: "testValue", numberProp: 42 };
  const testBoolean = true;

  const handleTestCamera = () => {
    updateURL(serializeCameraPosition(testCameraPosition));
  };

  const handleTestProps = () => {
    updateURL({
      props: serializeJSON(testProps),
    });
  };

  const handleTestBoolean = () => {
    updateURL({
      showPropsEditor: testBoolean.toString(),
    });
  };

  const handleClearAll = () => {
    clearAllParams();
  };

  return (
    <div
      style={{
        padding: "20px",
        background: "#1a1a1a",
        color: "white",
        minHeight: "100vh",
        fontFamily: "monospace",
      }}
    >
      <h1>URL Parameter Test</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Current URL Parameters:</h2>
        <pre
          style={{
            background: "#333",
            padding: "10px",
            borderRadius: "5px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(urlParams, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Test Functions:</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleTestCamera}
            style={{
              padding: "10px 20px",
              background: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Test Camera Position
          </button>

          <button
            onClick={handleTestProps}
            style={{
              padding: "10px 20px",
              background: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Test Props
          </button>

          <button
            onClick={handleTestBoolean}
            style={{
              padding: "10px 20px",
              background: "#FF9800",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Test Boolean
          </button>

          <button
            onClick={handleClearAll}
            style={{
              padding: "10px 20px",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Parsed Values:</h2>
        <div
          style={{ background: "#333", padding: "10px", borderRadius: "5px" }}
        >
          <p>
            <strong>Camera Position:</strong>{" "}
            {JSON.stringify(
              parseCameraPosition(
                getParam("cameraX"),
                getParam("cameraY"),
                getParam("cameraZ")
              )
            )}
          </p>
          <p>
            <strong>Props:</strong>{" "}
            {JSON.stringify(parseJSON(getParam("props"), {}))}
          </p>
          <p>
            <strong>Show Props Editor:</strong>{" "}
            {parseBoolean(getParam("showPropsEditor")).toString()}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Instructions:</h2>
        <ol>
          <li>Click the test buttons to set URL parameters</li>
          <li>Refresh the page to see if parameters persist</li>
          <li>Use browser back/forward buttons to test navigation</li>
          <li>Check the URL in the address bar to see the parameters</li>
        </ol>
      </div>
    </div>
  );
};

export default URLParamTest;
