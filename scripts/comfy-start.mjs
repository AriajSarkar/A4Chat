import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Dynamically resolve the LocalAppData directory without hardcoding the username.
// This works perfectly on Windows regardless of Docker, WSL, or Git Bash.
const localAppData =
  process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || "", "AppData", "Local");

const pythonExe = path.join(localAppData, "ComfyUI", ".venv", "Scripts", "python.exe");
const mainPy = path.join(localAppData, "Programs", "ComfyUI", "resources", "ComfyUI", "main.py");
const baseDir = path.join(localAppData, "ComfyUI");

if (!fs.existsSync(pythonExe)) {
  console.error(`Error: ComfyUI python executable not found at ${pythonExe}`);
  console.error("Make sure ComfyUI is installed in the default location.");
  process.exit(1);
}

console.log("Starting ComfyUI Server...");

// Spawn the Python process with all the required flags
const child = spawn(
  pythonExe,
  [mainPy, "--listen", "0.0.0.0", "--base-directory", baseDir, "--enable-cors-header", "*"],
  { stdio: "inherit" },
);

child.on("error", (err) => {
  console.error("Failed to start ComfyUI:", err.message);
});
