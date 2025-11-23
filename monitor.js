const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const fs = require("fs-extra");

puppeteer.use(StealthPlugin());

const URL = "https://cinepolis.com/in";
const STATUS_FILE = "public/status.json";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
    console.log("Telegram alert sent");
  } catch (err) {
    console.log("Telegram Error:", err.response?.data || err.message);
  }
}

(async () => {
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  let isDown = false;

  try {
    const resp = await page.goto(URL, {
      timeout: 45000,
      waitUntil: "networkidle2"
    });

    const status = resp.status();
    console.log("HTTP Status:", status);

    if (status >= 400 || status === 403 || status === 503) {
      isDown = true;
    }

  } catch (err) {
    console.log("Puppeteer error:", err.message);
    isDown = true;
  }

  await browser.close();

  const responseTime = Date.now() - start;

  const statusData = {
    status: isDown ? "DOWN" : "UP",
    responseTime,
    realDown: isDown,
    checkedAt: new Date().toISOString(),
  };

  await fs.outputJson(STATUS_FILE, statusData, { spaces: 2 });
  console.log("Status saved:", statusData);

  if (isDown) {
    await sendTelegramAlert(`🚨 Cinepolis Website is DOWN!
🌐 ${URL}
⏱ Response Time: ${responseTime}ms
🕒 Checked: ${new Date().toISOString()}`);
  }
})();
