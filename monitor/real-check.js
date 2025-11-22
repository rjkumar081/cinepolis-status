const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const https = require("https");

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendTelegram(message) {
  return new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(message)}`;

    https.get(url, (res) => {
      res.on("data", () => {});
      res.on("end", resolve);
    }).on("error", reject);
  });
}

async function checkSite() {
  const url = "https://www.cinepolis.com/in";
  const start = Date.now();

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/123.0.0.0 Safari/537.36"
  );

  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    const responseTime = Date.now() - start;
    const statusCode = response.status();

    await browser.close();

    return {
      status: [200, 301, 302, 307].includes(statusCode) ? "UP" : "DOWN",
      statusCode,
      responseTime,
      checked_at: new Date().toISOString()
    };
  } catch (err) {
    await browser.close();
    return {
      status: "DOWN",
      statusCode: 0,
      responseTime: Date.now() - start,
      checked_at: new Date().toISOString()
    };
  }
}

(async () => {
  const result = await checkSite();

  // Send alert
  if (result.status === "DOWN") {
    await sendTelegram(`❌ Cinepolis DOWN\nStatus: ${result.statusCode}\nTime: ${result.responseTime}ms`);
  } else {
    await sendTelegram(`✅ Cinepolis UP (${result.statusCode})\nResponse: ${result.responseTime}ms`);
  }

  // Save logs
  const outputPath = path.join("public", "status.json");
  let history = [];

  if (fs.existsSync(outputPath)) {
    try {
      history = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch {}
  }

  history.push(result);

  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  history = history.filter(
    (e) => new Date(e.checked_at).getTime() >= cutoff
  );

  fs.writeFileSync(outputPath, JSON.stringify(history, null, 2));
})();
