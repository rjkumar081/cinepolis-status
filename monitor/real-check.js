const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const axios = require("axios");

const URL = "https://cinepolis.com/in";
const STATUS_FILE = "status.json";
const LOG_FILE = "public/logs/log.json";

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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const start = Date.now();
    const res = await page.goto(URL, { timeout: 30000, waitUntil: "domcontentloaded" });
    responseTime = Date.now() - start;

    const html = await page.content();

    // ------------------------------
    // Detect Cloudflare Firewall Page
    // ------------------------------
    const isCloudflareBlocked =
      html.includes("Checking your browser before accessing") ||
      html.includes("cf-browser-verification") ||
      html.includes("cloudflare") ||
      html.includes("Attention Required!");

    // ------------------------------
    // Detect actual Cinepolis homepage
    // ------------------------------
    const isHomepage =
      html.includes("Cinépolis") ||
      html.includes("movies") ||
      html.includes("theatre") ||
      html.includes("cinepolis");

    if (isHomepage) {
      finalStatus = "UP";
    } else if (isCloudflareBlocked) {
      finalStatus = "UP"; // Cloudflare blocked us but website itself is UP
    } else {
      realDown = true;
      finalStatus = "DOWN";
    }

    // Save screenshot for debugging when page not detected
    if (!isHomepage) {
      await page.screenshot({ path: "public/logs/latest_screenshot.png" });
    }

    await browser.close();
  } catch (error) {
    realDown = true;
    finalStatus = "DOWN";
  }

  // ------------------------------
  // Save status.json
  // ------------------------------
  await fs.writeJson(STATUS_FILE, {
    status: finalStatus,
    responseTime,
    realDown,
    checkedAt: new Date().toISOString(),
  });

  // ------------------------------
  // Telegram Alert ONLY if real DOWN
  // ------------------------------
  if (realDown) {
    const msg = `
🚨 Cinepolis Website is DOWN!
🌐 ${URL}
⏱ Response Time: ${responseTime}ms
🕒 Checked: ${new Date().toISOString()}
    `;

    try {
      await axios.get(
        `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(
          msg
        )}`
      );
    } catch (err) {}
  }
})();
