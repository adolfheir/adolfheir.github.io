import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// No StrictMode: the Babylon engine owns a WebGL context + render loop, so we
// avoid React's dev-only double-mount re-initializing it.
createRoot(document.getElementById("root")).render(<App />);
