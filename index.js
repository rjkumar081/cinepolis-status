import { execSync } from "child_process";
import fs from "fs";

// Initialize log as an array
let log = [];

// Try to read existing log file if exists
try {
  const data = fs.readFileSync("log.json", "utf-8");
  log = JSON.parse(data);
} catch {
  log = [];
}

async function main() {
  try {
    // Website check
    const websiteUrl = "https://cinepolis.com/in";
    const output = execSync(`curl -s ${websiteUrl}`).toString();

    // Create a log entry
    const entry = {
      time: new Date().toISOString(),
      status: output.includes("Cinepolis") ? "UP" : "DOWN"
    };

    // Push entry to log array
    log.push(entry);

    console.log("Log updated:", log);

    // Save log to file
    fs.writeFileSync("log.json", JSON.stringify(log, null, 2));

  } catch (error) {
    console.error("Error:", error.message);
    log.push({ time: new Date().toISOString(), status: "ERROR", message: error.message });
    fs.writeFileSync("log.json", JSON.stringify(log, null, 2));
  }
}

main();
