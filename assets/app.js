
const state = {
  data: null,
  charts: {},
  rows: [],
  filteredRows: [],
  page: 1,
  pageSize: 25
};

const COLORS = [
  "#2563eb", "#06b6d4", "#8b5cf6", "#f59e0b",
  "#16a34a", "#ef4444", "#ec4899", "#64748b"
];

const statusColors = {
  "On Time": "#16a34a",
  "Delayed": "#f59e0b",
  "Cancelled": "#ef4444"
};

document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupTheme();
  await loadAnalysis();
});

function setupNavigation() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".page-section");

  function activate(id) {
    sections.forEach(s => s.classList.toggle("active-section", s.id === id));
    links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === `#${id}`));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      activate(link.getAttribute("href").substring(1));
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

function setupTheme() {
  const btn = document.getElementById("themeBtn");
  const saved = localStorage.getItem("airline-theme");

  if (saved === "dark") {
    document.documentElement.dataset.theme = "dark";
    btn.textContent = "☀";
  }

  btn.addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme === "dark";

    if (dark) {
      delete document.documentElement.dataset.theme;
      localStorage.setItem("airline-theme", "light");
      btn.textContent = "☾";
    } else {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("airline-theme", "dark");
      btn.textContent = "☀";
    }
  });
}

async function loadAnalysis() {
  try {
    const response = await fetch("data/analysis.json");
    if (!response.ok) throw new Error("Could not load analysis.json");
    state.data = await response.json();
    renderDashboard();
    renderPassengers();
    renderFlights();
    renderGeography();
    renderTime();
    renderAirports();
    renderStatistics();
    renderInsights();
    renderMethodology();
    setupExplorer();
    await loadExplorerData();
  } catch (error) {
    console.error(error);
    showToast("Could not load analysis data.");
  }
}

function formatNumber(n) {
  return Number(n).toLocaleString("en-IN");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function baseChartOptions(horizontal = false) {
  const text = getComputedStyle(document.documentElement)
    .getPropertyValue("--muted").trim() || "#68758a";

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: text, font: { size: 10 } }
      }
    },
    scales: horizontal ? {
      x: { ticks: { color: text, font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { color: text, font: { size: 9 } }, grid: { color: "rgba(120,140,160,.12)" } }
    } : {
      x: { ticks: { color: text, font: { size: 9 } }, grid: { display: false } },
      y: { ticks: { color: text, font: { size: 9 } }, grid: { color: "rgba(120,140,160,.12)" } }
    }
  };
}

function createChart(id, type, labels, datasets, options = {}) {
  if (state.charts[id]) state.charts[id].destroy();

  const canvas = document.getElementById(id);
  if (!canvas) return;

  const finalOptions = {
    ...baseChartOptions(options.horizontal),
    ...options
  };

  state.charts[id] = new Chart(canvas, {
    type,
    data: { labels, datasets },
    options: finalOptions
  });
}

function simpleData(arr) {
  return {
    labels: arr.map(x => x.label),
    values: arr.map(x => x.value)
  };
}

function renderDashboard() {
  const d = state.data;
  const s = d.summary;

  setText("kpiRecords", formatNumber(s.total_records));
  setText("kpiAge", s.average_age.toFixed(2));
  setText("kpiNationality", formatNumber(s.nationalities));
  setText("kpiAirports", formatNumber(s.airports));
  setText("kpiArrival", formatNumber(s.arrival_airports));
  setText("kpiContinents", s.continents);

  let x = simpleData(d.status);
  createChart("statusChart", "doughnut", x.labels, [{
    data: x.values,
    backgroundColor: x.labels.map(x => statusColors[x] || COLORS[0]),
    borderWidth: 0
  }], {
    plugins: { legend: { position: "bottom" } }
  });

  x = simpleData(d.continent);
  createChart("continentChart", "bar", x.labels, [{
    label: "Passengers",
    data: x.values,
    backgroundColor: COLORS
  }]);

  x = simpleData(d.age_histogram);
  createChart("ageChart", "bar", x.labels, [{
    label: "Passengers",
    data: x.values,
    backgroundColor: "#2563eb"
  }]);

  x = simpleData(d.month);
  createChart("monthChart", "line", x.labels, [{
    label: "Flights",
    data: x.values,
    borderColor: "#06b6d4",
    backgroundColor: "rgba(6,182,212,.15)",
    fill: true,
    tension: .35,
    pointRadius: 3
  }]);
}

function renderPassengers() {
  const d = state.data;
  const s = d.summary;

  setText("statMeanAge", s.average_age.toFixed(2));
  setText("statMedianAge", s.median_age.toFixed(2));
  setText("statMinAge", s.minimum_age);
  setText("statMaxAge", s.maximum_age);

  let x = simpleData(d.gender);
  createChart("genderChart", "doughnut", x.labels, [{
    data: x.values,
    backgroundColor: ["#2563eb", "#ec4899"],
    borderWidth: 0
  }], { plugins: { legend: { position: "bottom" } } });

  x = simpleData(d.age_group);
  createChart("ageGroupChart", "bar", x.labels, [{
    label: "Passengers",
    data: x.values,
    backgroundColor: COLORS
  }]);

  x = simpleData(d.nationality_top10);
  createChart("nationalityChart", "bar", x.labels.reverse(), [{
    label: "Passengers",
    data: x.values.reverse(),
    backgroundColor: "#2563eb"
  }], { indexAxis: "y" });

  x = simpleData(d.age_histogram);
  createChart("ageHistChart", "bar", x.labels, [{
    label: "Passengers",
    data: x.values,
    backgroundColor: "#8b5cf6"
  }]);
}

function renderFlights() {
  const d = state.data;

  const total = d.summary.total_records;
  const statusCards = document.getElementById("statusCards");
  statusCards.innerHTML = "";

  d.status.forEach(item => {
    const pct = (item.value / total * 100).toFixed(2);
    const card = document.createElement("div");
    card.className = "status-card";
    card.innerHTML = `
      <small>${escapeHtml(item.label)}</small>
      <strong>${formatNumber(item.value)}</strong>
      <span>${pct}% of records</span>
    `;
    statusCards.appendChild(card);
  });

  createCrossTabChart("genderStatusChart", d.gender_status);
  createCrossTabChart("ageStatusChart", d.age_status);
  createCrossTabChart("continentStatusChart", d.continent_status);
  createCrossTabChart("domesticStatusChart", d.domestic_status);
}

function createCrossTabChart(id, payload) {
  createChart(
    id,
    "bar",
    payload.categories,
    payload.series.map(series => ({
      label: series.name,
      data: series.data,
      backgroundColor: statusColors[series.name] || COLORS[0]
    })),
    { scales: { x: { stacked: true }, y: { stacked: true } } }
  );
}

function renderGeography() {
  const d = state.data;

  let x = simpleData(d.continent);
  createChart("geoContinentChart", "polarArea", x.labels, [{
    data: x.values,
    backgroundColor: COLORS.map(c => c + "cc"),
    borderWidth: 0
  }], {
    scales: { r: { ticks: { display: false } } }
  });

  x = simpleData(d.country_top10);
  createChart("countryChart", "bar", x.labels.reverse(), [{
    label: "Records",
    data: x.values.reverse(),
    backgroundColor: "#06b6d4"
  }], { indexAxis: "y" });

  const table = document.getElementById("continentAgeTable");
  table.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Continent</th><th>Average Age</th></tr></thead>
        <tbody>
          ${d.avg_age_continent.map(x => `
            <tr><td>${escapeHtml(x.label)}</td><td>${x.value.toFixed(2)}</td></tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTime() {
  const d = state.data;

  let x = simpleData(d.year);
  createChart("yearChart", "line", x.labels, [{
    label: "Flights",
    data: x.values,
    borderColor: "#2563eb",
    backgroundColor: "rgba(37,99,235,.12)",
    fill: true,
    tension: .3
  }]);

  x = simpleData(d.day_of_week);
  createChart("dayChart", "bar", x.labels, [{
    label: "Flights",
    data: x.values,
    backgroundColor: "#8b5cf6"
  }]);

  createChart(
    "statusMonthChart",
    "line",
    d.status_month.categories,
    d.status_month.series.map(s => ({
      label: s.name,
      data: s.data,
      borderColor: statusColors[s.name] || COLORS[0],
      backgroundColor: "transparent",
      tension: .25,
      pointRadius: 2
    }))
  );
}

function renderAirports() {
  const d = state.data;

  let x = simpleData(d.airport_top10);
  createChart("airportChart", "bar", x.labels.reverse(), [{
    label: "Records",
    data: x.values.reverse(),
    backgroundColor: "#2563eb"
  }], { indexAxis: "y" });

  x = simpleData(d.arrival_top10);
  createChart("arrivalChart", "bar", x.labels.reverse(), [{
    label: "Records",
    data: x.values.reverse(),
    backgroundColor: "#06b6d4"
  }], { indexAxis: "y" });
}

function renderStatistics() {
  const d = state.data;
  const s = d.summary;

  setText("sMean", s.average_age.toFixed(2));
  setText("sMedian", s.median_age.toFixed(2));
  setText("sMin", s.minimum_age);
  setText("sMax", s.maximum_age);
  setText("sStd", s.std_age.toFixed(2));

  const tests = [
    ["Gender vs Flight Status", d.statistics.gender_vs_status],
    ["Continent vs Flight Status", d.statistics.continent_vs_status],
    ["Age Group vs Flight Status", d.statistics.age_group_vs_status],
    ["Domestic/International vs Flight Status", d.statistics.domestic_vs_status]
  ];

  const tbody = document.querySelector("#chiTable tbody");
  tbody.innerHTML = tests.map(([name, t]) => `
    <tr>
      <td>${escapeHtml(name)}</td>
      <td>${t.chi2.toLocaleString()}</td>
      <td>${formatP(t.p_value)}</td>
      <td>${t.degrees_of_freedom}</td>
      <td>${t.significant_at_0_05 ? "Significant association" : "Not significant"}</td>
    </tr>
  `).join("");
}

function formatP(p) {
  if (p === 0) return "< 0.000001";
  if (p < 0.000001) return p.toExponential(2);
  return p.toFixed(6);
}

function renderInsights() {
  const grid = document.getElementById("insightGrid");
  grid.innerHTML = state.data.insights.map(item => `
    <article class="insight-card">
      <div class="insight-icon">${item.icon}</div>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderMethodology() {
  const m = state.data.metadata;
  setText("datasetName", m.dataset_name);
  setText("metaRows", formatNumber(m.original_rows));
  setText("metaCols", m.original_columns);
  setText("metaDates", `${m.date_range[0]} → ${m.date_range[1]}`);
}

// ---------- Data Explorer ----------

async function loadExplorerData() {
  try {
    const response = await fetch("data/airline_cleaned.csv");
    if (!response.ok) throw new Error("CSV not found");
    const csvText = await response.text();

    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        state.rows = results.data;
        state.filteredRows = [...state.rows];
        populateFilters();
        renderTable();
      }
    });
  } catch (error) {
    console.error(error);
    document.getElementById("tableCount").textContent =
      "Data Explorer could not load the CSV.";
  }
}

function uniqueValues(field) {
  return [...new Set(
    state.rows.map(row => row[field]).filter(Boolean)
  )].sort();
}

function populateFilters() {
  fillSelect("genderFilter", uniqueValues("Gender"));
  fillSelect("continentFilter", uniqueValues("Continents"));
  fillSelect("statusFilter", uniqueValues("Flight Status"));
  fillSelect("ageFilter", uniqueValues("Age Group"));
}

function fillSelect(id, values) {
  const select = document.getElementById(id);
  values.forEach(v => {
    const option = document.createElement("option");
    option.value = v;
    option.textContent = v;
    select.appendChild(option);
  });
}

function setupExplorer() {
  document.getElementById("applyFilters").addEventListener("click", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("prevPage").addEventListener("click", () => {
    if (state.page > 1) {
      state.page--;
      renderTable();
    }
  });
  document.getElementById("nextPage").addEventListener("click", () => {
    const maxPage = Math.max(1, Math.ceil(state.filteredRows.length / state.pageSize));
    if (state.page < maxPage) {
      state.page++;
      renderTable();
    }
  });
  document.getElementById("downloadFiltered").addEventListener("click", downloadFiltered);
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  const gender = document.getElementById("genderFilter").value;
  const continent = document.getElementById("continentFilter").value;
  const status = document.getElementById("statusFilter").value;
  const age = document.getElementById("ageFilter").value;

  state.filteredRows = state.rows.filter(row => {
    const text = [
      row["Nationality"],
      row["Airport Name"],
      row["Country Name"],
      row["Arrival Airport"],
      row["Flight Status"]
    ].join(" ").toLowerCase();

    return (
      (!search || text.includes(search)) &&
      (!gender || row["Gender"] === gender) &&
      (!continent || row["Continents"] === continent) &&
      (!status || row["Flight Status"] === status) &&
      (!age || row["Age Group"] === age)
    );
  });

  state.page = 1;
  renderTable();
  showToast(`${formatNumber(state.filteredRows.length)} records found`);
}

function clearFilters() {
  document.getElementById("searchInput").value = "";
  ["genderFilter", "continentFilter", "statusFilter", "ageFilter"].forEach(id => {
    document.getElementById(id).value = "";
  });
  state.filteredRows = [...state.rows];
  state.page = 1;
  renderTable();
}

function renderTable() {
  const table = document.getElementById("dataTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  const columns = [
    "Gender", "Age", "Age Group", "Nationality",
    "Airport Name", "Country Name", "Continents",
    "Departure Date", "Arrival Airport",
    "Flight Status"
  ];

  thead.innerHTML = `<tr>${columns.map(c => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;

  const start = (state.page - 1) * state.pageSize;
  const pageRows = state.filteredRows.slice(start, start + state.pageSize);

  tbody.innerHTML = pageRows.map(row => `
    <tr>
      ${columns.map(c => `<td>${escapeHtml(row[c] ?? "")}</td>`).join("")}
    </tr>
  `).join("");

  const maxPage = Math.max(1, Math.ceil(state.filteredRows.length / state.pageSize));
  setText("tableCount", `${formatNumber(state.filteredRows.length)} matching records`);
  setText("pageInfo", `Page ${state.page} of ${maxPage}`);
}

function downloadFiltered() {
  if (!state.filteredRows.length) {
    showToast("There are no records to download.");
    return;
  }

  const csv = Papa.unparse(state.filteredRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "airline_filtered_data.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}
