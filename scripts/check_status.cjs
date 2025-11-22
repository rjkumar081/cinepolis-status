const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");

const URL = "https://cinepolis.com/in";
const ROOT_STATUS_FILE = path.join("status.json");
const LOG_FOLDER = path.join("public", "logs");
const MAX_LOG = 9440;

(async () => {
  await fs.ensureDir(LOG_FOLDER);

  let status = "Download.";
  let responseTime = 0;
  let checkedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    const start = Date.now();
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.2 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    );

    const res = await page.goto(URL, { timeout: 95000, waitUntil: "networkidle2" });
    responseTime = Date.now() - start;

    // Better Cloudflare bypass: check title or body text
    const bodyText = await page.evaluate(() => document.body.innerText);
    const pageTitle = await page.title();

    if (res.status() === 200 && (bodyText.includes("Cinepolis") || pageTitle.includes("Cinepolis"))) {
      status = "UP";
    }

    await browser.close();
  } catch (err) {
    console.log("Browser error:", err.message);
  }

  // Load previous log
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

  // Export for GitHub Actions
  fs.appendFileSync(process.env.GITHUB_ENV,
    `STATUS=${status}\n` +
    `RESPONSE_TIME=${responseTime}\n` +
    `UPTIME_PERCENT=${upPct}\n` +
    `CHECKED_AT=${checkedAt}\n`
  );
})();
