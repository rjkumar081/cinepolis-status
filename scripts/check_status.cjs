const puppeteer = require("puppeteer");
const fs = require("fs-extra");

const URL = "https://cinepolis.com/in";

(async () => {
  let status = "DOWN";

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    );

    const res = await page.goto(URL, { timeout: 45000, waitUntil: "networkidle2" });

    const content = await page.content();
    if (res.status() === 200 && content.includes("Cinepolis")) {
      status = "UP";
    }

    await browser.close();
  } catch (err) {
    console.log("Browser error:", err.message);
  }

  // Export for GitHub Actions
  require("fs").appendFileSync(process.env.GITHUB_ENV, `STATUS=${status}\n`);
})();
