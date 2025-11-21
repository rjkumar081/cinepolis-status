const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const lastChecked = document.getElementById('lastChecked');
const resp = document.getElementById('resp');
const uptime = document.getElementById('uptime');
const code = document.getElementById('code');
const logList = document.getElementById('logList');
const raw = document.getElementById('raw');
const modeBtn = document.getElementById('modeBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

let chart;

// TELEGRAM ALERT
async function sendTelegram(msg) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(msg)}`
    );
  } catch (e) { }
}

async function loadData() {
  try {
    const r = await fetch('status.json?nocache=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error("status.json missing");

    const data = await r.json();
    raw.textContent = JSON.stringify(data, null, 2);

    const latest = data[data.length - 1];

    statusText.textContent = latest.status;
    lastChecked.textContent = new Date(latest.checked_at).toLocaleString();
    resp.textContent = latest.response_time + " ms";
    code.textContent = latest.status_code;

    if (latest.status === "UP") {
      statusDot.className = "dot up";
    } else {
      statusDot.className = "dot down";
      sendTelegram("🚨 Cinepolis DOWN! Status: " + latest.status_code);
    }

    const upCount = data.filter(x => x.status === "UP").length;
    uptime.textContent = ((upCount / data.length) * 100).toFixed(2) + " %";

    logList.innerHTML = "";
    data.slice(-40).reverse().forEach(e => {
      logList.innerHTML += `
        <li style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e5e7eb;">
          <div>
            <strong>${e.status}</strong>
            <span class="small">${new Date(e.checked_at).toLocaleString()}</span>
          </div>
          <div>${e.response_time}ms</div>
        </li>`;
    });

    const ctx = document.getElementById('uptimeChart').getContext('2d');
    const labels = data.slice(-48).map(d => new Date(d.checked_at).toLocaleTimeString());
    const values = data.slice(-48).map(d => d.status === 'UP' ? 1 : 0);

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: values,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        scales: { y: { min: 0, max: 1, ticks: { stepSize: 1 } } },
        plugins: { legend: { display: false } }
      }
    });

  } catch (e) {
    raw.textContent = "Error: " + e.message;
    statusText.textContent = "Error";
    statusDot.className = "dot down";
  }
}

// DARK MODE
modeBtn.onclick = () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem("mode", document.documentElement.classList.contains("dark") ? "dark" : "light");
};

// LOAD SAVED MODE
if (localStorage.getItem("mode") === "dark") {
  document.documentElement.classList.add("dark");
}

// FULLSCREEN
fullscreenBtn.onclick = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
};

// AUTO REFRESH
setInterval(loadData, 30000);
loadData();
