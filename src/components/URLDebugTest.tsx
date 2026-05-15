import React from "react";
import { useURLParams } from "../hooks/useURLParams";

const URLDebugTest: React.FC = () => {
  const { urlParams, getParam } = useURLParams();

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
      <h1>URL Parameter Debug Test</h1>

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
        <h2>Specific Parameters:</h2>
        <div
          style={{ background: "#333", padding: "10px", borderRadius: "5px" }}
        >
          <p>
            <strong>Editor:</strong> {getParam("editor")}
          </p>
          <p>
            <strong>Category:</strong> {getParam("category")}
          </p>
          <p>
            <strong>Subcategory:</strong> {getParam("subcategory")}
          </p>
          <p>
            <strong>Component Type:</strong> {getParam("componentType")}
          </p>
          <p>
            <strong>Component Props:</strong> {getParam("componentProps")}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Test URLs:</h2>
        <div
          style={{ background: "#333", padding: "10px", borderRadius: "5px" }}
        >
          <p>
            <a
              href="?editor=true&category=biomes&componentType=arena"
              style={{ color: "#4CAF50" }}
            >
              ?editor=true&category=biomes&componentType=arena
            </a>
          </p>
          <p>
            <a
              href="?editor=true&category=biomes&componentType=arena&componentProps=%7B%22size%22%3A15%7D"
              style={{ color: "#4CAF50" }}
            >
              ?editor=true&category=biomes&componentType=arena&componentProps=
              {"{'size':15}"}
            </a>
          </p>
          <p>
            <a
              href="?editor=true&category=rooms&componentType=start"
              style={{ color: "#4CAF50" }}
            >
              ?editor=true&category=rooms&componentType=start
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default URLDebugTest;
