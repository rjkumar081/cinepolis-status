import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

// ----- Load log file -----
let log = [];

try {
  if (fs.existsSync("log.json")) {
    const data = fs.readFileSync("log.json", "utf8");
    log = data.trim() ? JSON.parse(data) : [];
  }
} catch (e) {
  log = [];
}
// --------------------------

app.post("/check", async (req, res) => {
  const url = "https://cinepolis.com/in";

  let status = "DOWN";
  let code = 0;

  try {
    const response = await fetch(url);
    code = response.status;
    if (response.status === 200) status = "UP";
  } catch (err) {
    status = "DOWN";
  }

  // ----- Add log entry -----
  const entry = {
    time: new Date().toISOString(),
    status,
    code
  };

  log.push(entry);

  fs.writeFileSync("log.json", JSON.stringify(log, null, 2));
  // -------------------------

  return res.json({ status, code });
});

app.listen(3000, () => console.log("API Running on 3000"));
