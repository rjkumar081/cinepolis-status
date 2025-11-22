const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");

const URL = "https://cinepolis.com/in";
const ROOT_STATUS_FILE = path.join("public", "status.json");
const LOG_FOLDER = path.join("public", "logs");
const MAX_LOG = 1440;

(async () => {
  await fs.ensureDir(LOG_FOLDER);

  let status = "DOWN";
  let statusCode = 0;
  let responseTime = 0;

  try {
    const start = Date.now();
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    );

    const res = await page.goto(URL, { timeout: 45000, waitUntil: "networkidle2" });
    responseTime = Date.now() - start;
    statusCode = res.status();

    const content = await page.content();
    if (content.includes("Cinepolis") || content.length > 1000) {
      status = "UP";
    }

    await browser.close();
  } catch (err) {
    console.log("Browser error:", err.message);
  }

  let log = [];
  try {
    log = JSON.parse(await fs.readFile(ROOT_STATUS_FILE, "utf8")) || [];
  } catch {}

  const entry = {
    checked_at: new Date().toISOString(),
    status,
    status_code: statusCode,
    response_time: responseTime
  };

  log.push(entry);
  if (log.length > MAX_LOG) log = log.slice(-MAX_LOG);

  const upPct = ((log.filter(e => e.status === "UP").length / log.length) * 100).toFixed(2);

  await fs.writeJson(ROOT_STATUS_FILE, log, { spaces: 2 });
  await fs.writeJson(path.join(LOG_FOLDER, `${Date.now()}.json`), entry, { spaces: 2 });

  fs.appendFileSync(process.env.GITHUB_ENV,
    `STATUS=${status}\n` +
    `STATUS_CODE=${statusCode}\n` +
    `RESPONSE_TIME=${responseTime}\n` +
    `UPTIME_PERCENT=${upPct}\n`
  );
})();
