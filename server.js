import express from "express";
import puppeteer from "puppeteer";
import fs from "fs-extra";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const SECRET = process.env.API_SECRET_KEY;

app.post("/check", async (req, res) => {
  const key = req.headers["x-api-key"];

  if (!key || key !== SECRET) {
    return res.status(403).json({ error: "Forbidden" });
  }

  let browser;
  let status = "DOWN";
  let responseTime = 0;
  let realDown = true;

  const start = Date.now();

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(20000);

    const response = await page.goto("https://cinepolis.com/in", {
      waitUntil: "load",
    });

    responseTime = Date.now() - start;

    if (response && response.status() === 200) {
      status = "UP";
      realDown = false;
    }
  } catch (e) {
    realDown = true;
  } finally {
    if (browser) await browser.close();
  }

  const obj = {
    status,
    responseTime,
    realDown,
    checkedAt: new Date().toISOString(),
  };

  fs.writeFileSync("status.json", JSON.stringify(obj, null, 2));

  return res.json(obj);
});

app.get("/", (req, res) => {
  res.send("Cinepolis Monitor Running");
});

app.listen(3000, () => console.log("Server LIVE on port 3000"));
