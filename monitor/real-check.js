const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const axios = require("axios");

const URL = "https://cinepolis.com/in";
const STATUS_FILE = "status.json";

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

(async () => {
  let browser;
  let finalStatus = "DOWN";
  let responseTime = 0;
  let realDown = false;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    const start = Date.now();

    const res = await page.goto(URL, {
      timeout: 40000,
      waitUntil: "domcontentloaded",
    });

    responseTime = Date.now() - start;
    const html = await page.content();

    // Cloudflare Detection
    const isCloudflare =
      html.includes("Checking your browser before accessing") ||
      html.includes("cf-browser-verification") ||
      html.includes("cloudflare") ||
      html.includes("Attention Required!");

    // Homepage detection
    const isHomepage =
      html.includes("Cinépolis") ||
      html.includes("movies") ||
      html.includes("theatre") ||
      html.includes("cinepolis");

    if (isHomepage) {
      finalStatus = "UP";
    } else if (isCloudflare) {
      finalStatus = "UP"; // Blocked but site is UP
    } else {
      realDown = true;
      finalStatus = "DOWN";
    }

    // Save screenshot when fail
    if (!isHomepage) {
      await page.screenshot({ path: "latest_screenshot.png" });
    }

    await browser.close();
  } catch (err) {
    realDown = true;
    finalStatus = "DOWN";
  }

  // Save status file
  await fs.writeJson(STATUS_FILE, {
    status: finalStatus,
    responseTime,
    realDown,
    checkedAt: new Date().toISOString(),
  });

  // Telegram alert for REAL DOWN only
  if (realDown) {
    const msg = `
🚨 *Cinepolis Website is DOWN!*  
🌍 ${URL}  
⏱ Response Time: ${responseTime}ms  
🕒 Checked: ${new Date().toISOString()}
`;

    try {
      await axios.get(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          params: {
            chat_id: TELEGRAM_CHAT_ID,
            text: msg,
            parse_mode: "Markdown"
          }
        }
      );
    } catch (e) {}
  }
})();
