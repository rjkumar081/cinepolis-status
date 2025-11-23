import express from "express";
import puppeteer from "puppeteer";

const app = express();

const SECRET_KEY = process.env.API_SECRET_KEY;

app.get("/check", async (req, res) => {
  if (req.query.key !== SECRET_KEY) {
    return res.status(403).json({ error: "Invalid key" });
  }

  const URL = "https://cinepolis.com/in";

  let browser;
  const start = Date.now();

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled"
      ]
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
    });

    const resp = await page.goto(URL, {
      timeout: 70000,
      waitUntil: "networkidle2"
    });

    const html = await page.content();
    const ms = Date.now() - start;

    if (
      html.includes("cf-browser-verification") ||
      html.includes("Attention Required") ||
      html.includes("cloudflare challenge")
    ) {
      return res.json({
        status: "CLOUDFLARE_BLOCK",
        realDown: false,
        responseTime: ms,
        checkedAt: new Date().toISOString()
      });
    }

    if (resp.status() === 200 && html.includes("Cinepolis")) {
      return res.json({
        status: "UP",
        realDown: false,
        responseTime: ms,
        checkedAt: new Date().toISOString()
      });
    }

    return res.json({
      status: "PARTIAL",
      realDown: false,
      responseTime: ms,
      checkedAt: new Date().toISOString()
    });
  } catch (e) {
    return res.json({
      status: "DOWN",
      realDown: true,
      responseTime: 0,
      checkedAt: new Date().toISOString()
    });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3000, () => console.log("API running"));
