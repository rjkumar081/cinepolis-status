const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");

const URL = "https://cinepolis.com/in";
const ROOT_STATUS_FILE = path.join("status.json");
const LOG_FOLDER = path.join("public", "logs");
const MAX_LOG = 9440;

(async () => {
  await fs.ensureDir(LOG_FOLDER);

  let status = null;  // NO DEFAULT
  let responseTime = 0;
  let checkedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  try {
    const start = Date.now();

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    );

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    const res = await page.goto(URL, {
      timeout: 60000,
      waitUntil: "domcontentloaded"
    });

    responseTime = Date.now() - start;

    const html = await page.content();

    // 1️⃣ Cloudflare Block Check
    if (
      html.includes("cf-browser-verification") ||
      html.includes("Attention Required") ||
      html.includes("cloudflare")
    ) {
      status = "CLOUDFLARE_BLOCK";
    }

    // 2️⃣ Website UP Check
    else if (
      res.status() === 200 &&
      (
        html.includes("Cinépolis") ||
        html.includes("Cinepolis India") ||
        html.includes("Now Showing") ||
        html.includes("Movies")
      )
    ) {
      status = "UP";
    }

    // 3️⃣ Website Open Hui But Content Nahi Mila
    else if (res.status() === 200) {
      status = "PARTIAL_UP";
    }

    await browser.close();
  } catch (err) {
    // 4️⃣ Browser Error → DOWN
    status = "DOWN";
  }

  // 5️⃣ Agar status abhi bhi null hai → UNKNOWN
  if (!status) status = "UNKNOWN";

  // Load previous logs
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
