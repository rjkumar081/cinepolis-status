async function load() {
  try {
    const res = await fetch("status.json?noCache=" + Date.now());
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      document.getElementById("status").textContent = "No data yet";
      return;
    }

    const latest = data[data.length - 1];

    document.getElementById("status").textContent = latest.status;
    document.getElementById("statusCode").textContent = latest.status_code;
    document.getElementById("respTime").textContent = latest.response_time;
    document.getElementById("checkedAt").textContent = latest.checked_at;

    document.getElementById("bigStatus").textContent =
      latest.status === "UP" ? "🟢 SITE UP" : "🔴 SITE DOWN";

    // uptime %
    const upCount = data.filter(e => e.status === "UP").length;
    const upPercent = ((upCount / data.length) * 100).toFixed(2);
    document.getElementById("uptime").textContent = upPercent;

    // Card classes
    const card = document.getElementById("statusCard");
    card.classList.remove("up", "down");
    card.classList.add(latest.status === "UP" ? "up" : "down");

    // Table
    const tbody = document.querySelector("#logTable tbody");
    tbody.innerHTML = "";
    [...data].reverse().slice(0, 20).forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${new Date(e.checked_at).toLocaleString()}</td>
        <td class="${e.status === "UP" ? "status-up" : "status-down"}">${e.status}</td>
        <td>${e.status_code}</td>
        <td>${e.response_time}ms</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.log("Error loading:", err);
    document.getElementById("bigStatus").textContent = "Error loading status.json";
  }
}

load();
setInterval(load, 10000);
