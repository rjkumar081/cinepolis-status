const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs-extra");
const path = require("path");

puppeteer.use(StealthPlugin());

const URL = "https://cinepolis.com/in";
const ROOT_STATUS_FILE = path.join("status.json");
const LOG_FOLDER = path.join("public", "logs");
const MAX_LOG = 9440;

(async () => {
  await fs.ensureDir(LOG_FOLDER);

  let status = null;
  let responseTime = 0;
  let checkedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    const start = Date.now();

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    const page = await browser.newPage();

    // Real desktop fingerprint
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.225 Safari/537.36"
    );

    await page.setViewport({ width: 1366, height: 768 });

    const res = await page.goto(URL, {
      timeout: 90000,
      waitUntil: "networkidle2"
    });

    responseTime = Date.now() - start;

    const html = await page.content();

    // ⛔ REAL CLOUDFLARE BLOCK CHECK
    if (html.includes("cf-challenge") || html.includes("Checking your browser") ||
        html.includes("verify you are human")) {
      status = "CLOUDFLARE_BLOCK";
    }
    // SITE CONTENT FOUND
    else if (html.includes("Cinépolis") || html.includes("Now Showing") || html.includes("Movies")) {
      status = "UP";
    }
    // HTTP 200 BUT CONTENT NOT LOADED
    else if (res.status() === 200) {
      status = "PARTIAL_UP";
    }

    await browser.close();
  } catch (err) {
    status = "DOWN";
  }

  if (!status) status = "UNKNOWN";

  // Load old log
  let log = [];
  if (await fs.pathExists(ROOT_STATUS_FILE)) {
    try { log = JSON.parse(await fs.readFile(ROOT_STATUS_FILE, "utf8")) || []; } catch {}
  }

  const entry = { checked_at: checkedAt, status, response_time: responseTime };
  log.push(entry);
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);

  const upPct = ((log.filter(e => e.status === "UP").length / log.length) * 100).toFixed(2);

  await fs.writeJson(ROOT_STATUS_FILE, log, { spaces: 2 });
  await fs.writeJson(path.join(LOG_FOLDER, `${Date.now()}.json`), entry, { spaces: 2 });

  fs.appendFileSync(process.env.GITHUB_ENV,
    `STATUS=${status}\n` +
    `RESPONSE_TIME=${responseTime}\n` +
    `UPTIME_PERCENT=${upPct}\n` +
    `CHECKED_AT=${checkedAt}\n`
  );
})();
