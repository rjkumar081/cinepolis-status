const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

const URL = "https://cinepolis.com/in";
const STATUS_FILE = path.join("public", "status.json");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(msg) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log("Telegram credentials missing");
    return;
  }

  try {
    await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        params: {
          chat_id: CHAT_ID,
          text: msg,
        },
      }
    );
    console.log("Telegram alert sent");
  } catch (err) {
    console.log("Telegram error:", err.message);
  }
}

(async () => {
  let browser;
  let status = "UP";
  let realDown = false;
  let responseTime = 0;

  try {
    const start = Date.now();
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    const response = await page.goto(URL, { timeout: 60000, waitUntil: "domcontentloaded" });

    responseTime = Date.now() - start;

    if (!response || !response.ok()) {
      status = "DOWN";
      realDown = true;
      await sendTelegram(`❌ Website DOWN\n⏱ Response: ${responseTime}ms`);
    } else {
      await sendTelegram(`✅ Website UP\n⏱ Response: ${responseTime}ms`);
    }
  } catch (e) {
    status = "DOWN";
    realDown = true;
    await sendTelegram(`❌ Website DOWN\n⚠ Error: ${e.message}`);
  }

  if (browser) await browser.close();

  await fs.ensureDir(path.dirname(STATUS_FILE));

  const data = { status, responseTime, realDown, checkedAt: new Date().toISOString() };
  await fs.writeJson(STATUS_FILE, data, { spaces: 2 });

  console.log("Status saved:", data);
})();
