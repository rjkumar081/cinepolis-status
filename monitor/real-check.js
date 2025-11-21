const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

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

  const outputPath = path.join("public", "status.json");
  let history = [];

  if (fs.existsSync(outputPath)) {
    try {
      history = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch {}
  }

  history.push(result);

  // keep last 7 days
  const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
  history = history.filter(
    (e) => new Date(e.checked_at).getTime() >= cutoff
  );

  fs.writeFileSync(outputPath, JSON.stringify(history, null, 2));
})();
