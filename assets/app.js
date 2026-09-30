
const state = {
  data: null,
  charts: {},
  rows: [],
  filteredRows: [],
  page: 1,
  pageSize: 25,
  changes: { edited: {}, deleted: [], added: [] },
  editingId: null
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

const EXPLORER_STORAGE_KEY = "altair-explorer-changes-v1";
const EDITABLE_FIELDS = [
  "Gender", "Age", "Nationality", "Airport Name", "Country Name",
  "Continents", "Departure Date", "Arrival Airport", "Flight Status"
];
const TABLE_COLUMNS = [
  "Gender", "Age", "Age Group", "Nationality", "Airport Name",
  "Country Name", "Continents", "Departure Date", "Arrival Airport",
  "Flight Status"
];

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
      updateChartsTheme();
    } else {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("airline-theme", "dark");
      btn.textContent = "☀";
      updateChartsTheme();
    }
  });
}

function updateChartsTheme() {
  const text = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() || "#68758a";
  const grid = "rgba(120,140,160,.12)";

  Object.values(state.charts).forEach(chart => {
    if (!chart) return;
    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = text;
    }
    ["x", "y"].forEach(axis => {
      if (chart.options.scales?.[axis]) {
        if (chart.options.scales[axis].ticks) chart.options.scales[axis].ticks.color = text;
        if (chart.options.scales[axis].grid && chart.options.scales[axis].grid.display !== false) {
          chart.options.scales[axis].grid.color = grid;
        }
      }
    });
    chart.update("none");
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


function normalizeValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function uniqueValues(field) {
  return [...new Set(
    state.rows.map(row => String(row[field] ?? "").trim()).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }));
}

function fillSelect(id, values, keepValue = "") {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = '<option value="">All</option>';
  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  if (values.includes(keepValue)) select.value = keepValue;
}

function populateFilters() {
  const current = {
    gender: document.getElementById("genderFilter")?.value || "",
    continent: document.getElementById("continentFilter")?.value || "",
    status: document.getElementById("statusFilter")?.value || "",
    age: document.getElementById("ageFilter")?.value || ""
  };
  fillSelect("genderFilter", uniqueValues("Gender"), current.gender);
  fillSelect("continentFilter", uniqueValues("Continents"), current.continent);
  fillSelect("statusFilter", uniqueValues("Flight Status"), current.status);
  fillSelect("ageFilter", uniqueValues("Age Group"), current.age);
}

function setupExplorer() {
  document.getElementById("applyFilters").addEventListener("click", applyFilters);
  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("downloadFiltered").addEventListener("click", downloadFiltered);
  document.getElementById("addRecord").addEventListener("click", () => openRecordModal());
  document.getElementById("resetData").addEventListener("click", resetExplorerChanges);
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

  const searchInput = document.getElementById("searchInput");
  let timer;
  searchInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilters, 180);
  });

  document.getElementById("closeRecordModal").addEventListener("click", closeRecordModal);
  document.getElementById("cancelRecord").addEventListener("click", closeRecordModal);
  document.getElementById("recordModal").addEventListener("click", event => {
    if (event.target.id === "recordModal") closeRecordModal();
  });
  document.getElementById("recordForm").addEventListener("submit", saveRecordFromForm);
}

function loadExplorerChanges() {
  try {
    const raw = localStorage.getItem(EXPLORER_STORAGE_KEY);
    if (!raw) return { edited: {}, deleted: [], added: [] };
    const parsed = JSON.parse(raw);
    return {
      edited: parsed.edited && typeof parsed.edited === "object" ? parsed.edited : {},
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
      added: Array.isArray(parsed.added) ? parsed.added : []
    };
  } catch (error) {
    console.warn("Could not restore saved data changes", error);
    return { edited: {}, deleted: [], added: [] };
  }
}

function persistExplorerChanges() {
  localStorage.setItem(EXPLORER_STORAGE_KEY, JSON.stringify(state.changes));
}

function applySavedChanges(baseRows) {
  const deleted = new Set(state.changes.deleted);
  const edited = state.changes.edited || {};
  const rows = baseRows
    .filter(row => !deleted.has(row._rowId))
    .map(row => edited[row._rowId] ? { ...row, ...edited[row._rowId] } : row);

  const added = (state.changes.added || []).map(row => ({ ...row }));
  return rows.concat(added);
}

async function loadExplorerData() {
  return new Promise((resolve, reject) => {
    Papa.parse("data/airline_cleaned.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: results => {
        if (results.errors && results.errors.length) {
          console.warn("CSV parse warnings", results.errors.slice(0, 3));
        }
        const baseRows = (results.data || [])
          .filter(row => row && Object.values(row).some(value => String(value ?? "").trim() !== ""))
          .map((row, index) => ({ ...row, _rowId: `base-${index}` }));

        state.changes = loadExplorerChanges();
        state.rows = applySavedChanges(baseRows);
        state.filteredRows = [...state.rows];

        // Use the live CRUD dataset as the single source of truth for all analytics.
        // This keeps charts, KPIs, statistics and insights synchronized with
        // Add / Edit / Delete changes made in the Data Explorer.
        refreshAnalyticsFromRows();

        populateFilters();
        renderTable();
        resolve();
      },
      error: error => reject(error)
    });
  });
}

/* --------------------------------------------------------------------------
   LIVE ANALYTICS ENGINE
   --------------------------------------------------------------------------
   The dashboard initially loads precomputed analysis.json so the page can
   render quickly. Once the cleaned CSV is loaded, state.rows becomes the
   single source of truth and this engine recalculates every dashboard metric.
   Therefore Add / Edit / Delete changes are reflected across the entire app.
---------------------------------------------------------------------------- */

function cleanLabel(value) {
  return String(value ?? "").trim();
}

function countBy(rows, field) {
  const counts = new Map();
  rows.forEach(row => {
    const value = cleanLabel(row[field]);
    if (!value) return;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return counts;
}

function countsToArray(counts, options = {}) {
  const entries = [...counts.entries()];
  if (options.order) {
    const order = new Map(options.order.map((value, index) => [value, index]));
    entries.sort((a, b) => (order.get(a[0]) ?? 9999) - (order.get(b[0]) ?? 9999));
  } else {
    entries.sort((a, b) => b[1] - a[1]);
  }
  return entries.map(([label, value]) => ({ label, value }));
}

function topCounts(rows, field, limit = 10) {
  return countsToArray(countBy(rows, field)).slice(0, limit);
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sampleStd(values, meanValue) {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - meanValue, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function parseDepartureDate(row) {
  const raw = cleanLabel(row["Departure Date"]);
  if (!raw) return null;

  let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const date = new Date(Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2])));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function deriveDateParts(row) {
  const date = parseDepartureDate(row);
  if (!date) return null;
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return {
    year: String(date.getUTCFullYear()),
    month: date.getUTCMonth() + 1,
    monthName: monthNames[date.getUTCMonth()],
    dayOfWeek: dayNames[date.getUTCDay()]
  };
}

function getAgeGroup(age) {
  const value = Number(age);
  if (!Number.isFinite(value)) return "";
  if (value <= 12) return "Child";
  if (value <= 18) return "Teenager";
  if (value <= 35) return "Young Adult";
  if (value <= 60) return "Adult";
  return "Senior";
}

function getAgeHistogramLabel(age) {
  const value = Number(age);
  if (!Number.isFinite(value)) return "";
  if (value <= 9) return "1–9";
  if (value <= 18) return "9–18";
  if (value <= 27) return "18–27";
  if (value <= 36) return "27–36";
  if (value <= 45) return "36–45";
  if (value <= 54) return "45–54";
  if (value <= 63) return "54–63";
  if (value <= 72) return "63–72";
  if (value <= 81) return "72–81";
  if (value <= 90) return "81–90";
  return "";
}

function normalizeAnalyticsRows(rows) {
  return rows.map(row => {
    const copy = { ...row };
    const age = Number(copy.Age);
    if (Number.isFinite(age)) copy["Age Group"] = getAgeGroup(age);

    const dateParts = deriveDateParts(copy);
    if (dateParts) {
      copy["Departure Year"] = dateParts.year;
      copy["Departure Month"] = String(dateParts.month);
      copy["Departure Month Name"] = dateParts.monthName;
      copy["Day of Week"] = dateParts.dayOfWeek;
      copy["Weekend/Weekday"] = ["Saturday", "Sunday"].includes(dateParts.dayOfWeek) ? "Weekend" : "Weekday";
    }

    const nationality = normalizeValue(copy.Nationality);
    const country = normalizeValue(copy["Country Name"]);
    if (nationality && country) {
      copy["Domestic/International"] = nationality === country ? "Domestic" : "International";
    }
    return copy;
  });
}

function crossTab(rows, categoryField, statusField = "Flight Status", categoryOrder = null) {
  const categories = categoryOrder
    ? categoryOrder.filter(value => rows.some(row => cleanLabel(row[categoryField]) === value))
    : countsToArray(countBy(rows, categoryField)).map(item => item.label);

  const statuses = ["Cancelled", "Delayed", "On Time"];
  const series = statuses.map(status => ({
    name: status,
    data: categories.map(category => rows.filter(row =>
      cleanLabel(row[categoryField]) === category && cleanLabel(row[statusField]) === status
    ).length)
  }));

  return { categories, series };
}

function averageBy(rows, field) {
  const groups = new Map();
  rows.forEach(row => {
    const label = cleanLabel(row[field]);
    const age = Number(row.Age);
    if (!label || !Number.isFinite(age)) return;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(age);
  });
  return [...groups.entries()]
    .map(([label, values]) => ({ label, value: Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) }))
    .sort((a, b) => b.value - a.value);
}

function chiSquareTest(rows, categoryField, statusField = "Flight Status", categoryOrder = null) {
  const categories = categoryOrder
    ? categoryOrder.filter(value => rows.some(row => cleanLabel(row[categoryField]) === value))
    : countsToArray(countBy(rows, categoryField)).map(item => item.label);
  const statuses = ["Cancelled", "Delayed", "On Time"];

  const table = categories.map(category => statuses.map(status => rows.filter(row =>
    cleanLabel(row[categoryField]) === category && cleanLabel(row[statusField]) === status
  ).length));

  const rowTotals = table.map(row => row.reduce((sum, value) => sum + value, 0));
  const colTotals = statuses.map((_, col) => table.reduce((sum, row) => sum + row[col], 0));
  const total = rowTotals.reduce((sum, value) => sum + value, 0);

  if (!total || categories.length < 2) {
    return { chi2: 0, p_value: 1, degrees_of_freedom: 0, significant_at_0_05: false };
  }

  let chi2 = 0;
  table.forEach((row, r) => {
    row.forEach((observed, c) => {
      const expected = (rowTotals[r] * colTotals[c]) / total;
      if (expected > 0) chi2 += Math.pow(observed - expected, 2) / expected;
    });
  });

  const degrees = (categories.length - 1) * (statuses.length - 1);
  const pValue = chiSquareSurvival(chi2, degrees);
  return {
    chi2: Number(chi2.toFixed(4)),
    p_value: pValue,
    degrees_of_freedom: degrees,
    significant_at_0_05: pValue < 0.05
  };
}

// Regularized upper incomplete gamma Q(a, x), used for chi-square p-values.
function chiSquareSurvival(x, degrees) {
  if (!Number.isFinite(x) || x < 0 || degrees <= 0) return 1;
  return gammaQ(degrees / 2, x / 2);
}

function gammaQ(a, x) {
  if (x < 0 || a <= 0) return 1;
  if (x === 0) return 1;
  if (x < a + 1) return 1 - gammaPSeries(a, x);
  return gammaQContinuedFraction(a, x);
}

function gammaPSeries(a, x) {
  const gln = logGamma(a);
  let sum = 1 / a;
  let term = sum;
  for (let n = 1; n <= 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

function gammaQContinuedFraction(a, x) {
  const gln = logGamma(a);
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / Math.max(Math.abs(b), tiny);
  let h = d;

  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-14) break;
  }

  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

function logGamma(z) {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < coefficients.length; i++) x += coefficients[i] / (z + i + 1);
  const t = z + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function buildInsights(d) {
  const largestAge = d.age_group[0]?.label || "N/A";
  const largestStatus = d.status[0]?.label || "N/A";
  const largestContinent = d.continent[0]?.label || "N/A";
  const largestNationality = d.nationality_top10[0]?.label || "N/A";
  const largestAirport = d.airport_top10[0]?.label || "N/A";
  const largestMonth = d.month.reduce((a, b) => b.value > a.value ? b : a, d.month[0] || { label: "N/A", value: 0 });
  const largestDay = d.day_of_week.reduce((a, b) => b.value > a.value ? b : a, d.day_of_week[0] || { label: "N/A", value: 0 });
  const largestTravel = d.domestic_status.series.reduce((sum, series) => sum + (series.name === "International" ? series.data.reduce((a, b) => a + b, 0) : 0), 0);
  const domesticTotal = d.domestic_status.categories.includes("Domestic")
    ? d.domestic_status.categories.indexOf("Domestic")
    : -1;
  const internationalTotal = d.domestic_status.categories.includes("International")
    ? d.domestic_status.categories.indexOf("International")
    : -1;
  const domesticCount = domesticTotal >= 0 ? d.domestic_status.series.reduce((sum, s) => sum + s.data[domesticTotal], 0) : 0;
  const internationalCount = internationalTotal >= 0 ? d.domestic_status.series.reduce((sum, s) => sum + s.data[internationalTotal], 0) : largestTravel;

  return [
    { icon: "👤", title: "Passenger profile", text: `The average passenger age is ${d.summary.average_age.toFixed(2)} years, with ${largestAge} being the largest age group.` },
    { icon: "✈️", title: "Flight status", text: `'${largestStatus}' is the most frequently recorded flight status in the dataset.` },
    { icon: "🌍", title: "Geographic distribution", text: `${largestContinent} has the largest number of passenger records among the continents represented.` },
    { icon: "🧭", title: "Nationality", text: `${largestNationality} is the most frequently represented nationality in the dataset.` },
    { icon: "🏢", title: "Airport activity", text: `${largestAirport} is the most frequently represented departure airport.` },
    { icon: "📅", title: "Time pattern", text: `${largestMonth.label} has the highest number of departure records, while ${largestDay.label} is the busiest day of week.` },
    { icon: "🌐", title: "Travel classification", text: internationalCount >= domesticCount ? `The approximate nationality-vs-airport-country classification contains more 'International' records.` : `The approximate nationality-vs-airport-country classification contains more 'Domestic' records.` }
  ];
}

function buildLiveAnalytics(rows) {
  const data = normalizeAnalyticsRows(rows);
  const ages = data.map(row => Number(row.Age)).filter(Number.isFinite);
  const meanAge = ages.length ? ages.reduce((sum, value) => sum + value, 0) / ages.length : 0;
  const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const ageGroupOrder = ["Child", "Teenager", "Young Adult", "Adult", "Senior"];
  const statusOrder = ["Cancelled", "Delayed", "On Time"];
  const continentOrder = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];
  const domesticOrder = ["Domestic", "International"];

  const years = countsToArray(countBy(data, "Departure Year")).sort((a, b) => Number(a.label) - Number(b.label));
  const months = countsToArray(countBy(data, "Departure Month Name"), { order: monthOrder });
  const days = countsToArray(countBy(data, "Day of Week"), { order: dayOrder });
  const genders = countsToArray(countBy(data, "Gender"));
  const ageGroups = countsToArray(countBy(data, "Age Group"));
  const continents = countsToArray(countBy(data, "Continents"));
  const statuses = countsToArray(countBy(data, "Flight Status"));
  const domestic = countsToArray(countBy(data, "Domestic/International"), { order: domesticOrder });

  const statusMonth = {
    categories: monthOrder.filter(month => data.some(row => cleanLabel(row["Departure Month Name"]) === month)),
    series: statusOrder.map(status => ({
      name: status,
      data: monthOrder.map(month => data.filter(row => cleanLabel(row["Departure Month Name"]) === month && cleanLabel(row["Flight Status"]) === status).length)
    }))
  };

  const ageHistogramOrder = ["1–9", "9–18", "18–27", "27–36", "36–45", "45–54", "54–63", "63–72", "72–81", "81–90"];
  const ageHistogram = countsToArray(countBy(data.map(row => ({ ...row, AgeHistogram: getAgeHistogramLabel(row.Age) })), "AgeHistogram"), { order: ageHistogramOrder });

  const summary = {
    total_records: data.length,
    average_age: Number(meanAge.toFixed(2)),
    median_age: median(ages),
    minimum_age: ages.length ? Math.min(...ages) : 0,
    maximum_age: ages.length ? Math.max(...ages) : 0,
    std_age: Number(sampleStd(ages, meanAge).toFixed(2)),
    nationalities: new Set(data.map(row => cleanLabel(row.Nationality)).filter(Boolean)).size,
    airports: new Set(data.map(row => cleanLabel(row["Airport Name"])).filter(Boolean)).size,
    arrival_airports: new Set(data.map(row => cleanLabel(row["Arrival Airport"])).filter(Boolean)).size,
    continents: new Set(data.map(row => cleanLabel(row.Continents)).filter(Boolean)).size,
    years: years.length,
    statuses: statuses.length,
    duplicate_records_removed: 0,
    missing_values_total: data.reduce((sum, row) => sum + Object.entries(row).filter(([key, value]) => key !== "_rowId" && String(value ?? "").trim() === "").length, 0)
  };

  const genderStatus = crossTab(data, "Gender", "Flight Status", ["Female", "Male"]);
  const continentStatus = crossTab(data, "Continents", "Flight Status", continentOrder);
  const ageStatus = crossTab(data, "Age Group", "Flight Status", ageGroupOrder);
  const domesticStatus = crossTab(data, "Domestic/International", "Flight Status", domesticOrder);

  const result = {
    metadata: state.data?.metadata || {},
    summary,
    gender: genders,
    age_histogram: ageHistogram,
    age_group: ageGroups,
    nationality_top10: topCounts(data, "Nationality"),
    continent: continents,
    country_top10: topCounts(data, "Country Name"),
    status: statuses,
    airport_top10: topCounts(data, "Airport Name"),
    arrival_top10: topCounts(data, "Arrival Airport"),
    year: years,
    month: months,
    day_of_week: days,
    gender_status: genderStatus,
    continent_status: continentStatus,
    age_status: ageStatus,
    domestic_status: domesticStatus,
    status_month: statusMonth,
    avg_age_gender: averageBy(data, "Gender"),
    avg_age_continent: averageBy(data, "Continents"),
    statistics: {
      gender_vs_status: chiSquareTest(data, "Gender"),
      continent_vs_status: chiSquareTest(data, "Continents", "Flight Status", continentOrder),
      age_group_vs_status: chiSquareTest(data, "Age Group", "Flight Status", ageGroupOrder),
      domestic_vs_status: chiSquareTest(data, "Domestic/International", "Flight Status", domesticOrder)
    }
  };

  result.insights = buildInsights(result);
  return result;
}

function refreshAnalyticsFromRows() {
  if (!state.rows.length) return;
  state.data = buildLiveAnalytics(state.rows);
  renderDashboard();
  renderPassengers();
  renderFlights();
  renderGeography();
  renderTime();
  renderAirports();
  renderStatistics();
  renderInsights();
}

function applyFilters() {
  const search = normalizeValue(document.getElementById("searchInput").value);
  const gender = normalizeValue(document.getElementById("genderFilter").value);
  const continent = normalizeValue(document.getElementById("continentFilter").value);
  const status = normalizeValue(document.getElementById("statusFilter").value);
  const age = normalizeValue(document.getElementById("ageFilter").value);

  state.filteredRows = state.rows.filter(row => {
    const allFields = Object.entries(row)
      .filter(([key]) => key !== "_rowId")
      .map(([, value]) => normalizeValue(value))
      .join(" ");

    return (
      (!search || allFields.includes(search)) &&
      (!gender || normalizeValue(row["Gender"]) === gender) &&
      (!continent || normalizeValue(row["Continents"]) === continent) &&
      (!status || normalizeValue(row["Flight Status"]) === status) &&
      (!age || normalizeValue(row["Age Group"]) === age)
    );
  });

  state.page = 1;
  renderTable();
  setText("tableCount", `${formatNumber(state.filteredRows.length)} matching records`);
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

  thead.innerHTML = `<tr>${TABLE_COLUMNS.map(c => `<th>${escapeHtml(c)}</th>`).join("")}<th>Actions</th></tr>`;

  const start = (state.page - 1) * state.pageSize;
  const pageRows = state.filteredRows.slice(start, start + state.pageSize);

  tbody.innerHTML = pageRows.map(row => `
    <tr>
      ${TABLE_COLUMNS.map(c => `<td>${escapeHtml(row[c] ?? "")}</td>`).join("")}
      <td class="table-actions">
        <button class="table-action edit" data-action="edit" data-row-id="${escapeHtml(row._rowId)}">Edit</button>
        <button class="table-action delete" data-action="delete" data-row-id="${escapeHtml(row._rowId)}">Delete</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".table-action").forEach(button => {
    button.addEventListener("click", () => {
      const row = state.rows.find(item => item._rowId === button.dataset.rowId);
      if (!row) return;
      if (button.dataset.action === "edit") openRecordModal(row);
      else deleteRecord(row);
    });
  });

  const maxPage = Math.max(1, Math.ceil(state.filteredRows.length / state.pageSize));
  if (state.page > maxPage) state.page = maxPage;
  setText("tableCount", `${formatNumber(state.filteredRows.length)} matching records`);
  setText("pageInfo", `Page ${state.page} of ${maxPage}`);
}

function buildDerivedFields(row) {
  const result = { ...row };
  const age = Number(result.Age);
  if (Number.isFinite(age)) {
    result.Age = String(Math.round(age));
    if (age <= 12) result["Age Group"] = "Child";
    else if (age <= 18) result["Age Group"] = "Teenager";
    else if (age <= 35) result["Age Group"] = "Young Adult";
    else if (age <= 60) result["Age Group"] = "Adult";
    else result["Age Group"] = "Senior";
  } else {
    result["Age Group"] = "";
  }

  const dateText = String(result["Departure Date"] || "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Date(`${dateText}T00:00:00Z`) : null;
  if (date && !Number.isNaN(date.getTime())) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    result["Departure Year"] = String(date.getUTCFullYear());
    result["Departure Month"] = String(date.getUTCMonth() + 1);
    result["Departure Month Name"] = monthNames[date.getUTCMonth()];
    result["Departure Day"] = String(date.getUTCDate());
    result["Day of Week"] = dayNames[date.getUTCDay()];
    result["Weekend/Weekday"] = date.getUTCDay() >= 5 ? "Weekend" : "Weekday";
  }

  const nationality = normalizeValue(result.Nationality);
  const country = normalizeValue(result["Country Name"]);
  if (nationality && country) {
    result["Domestic/International"] = nationality === country ? "Domestic" : "International";
  }

  return result;
}

function cleanEditableRow(row) {
  const clean = {};
  EDITABLE_FIELDS.forEach(field => { clean[field] = row[field] ?? ""; });
  return buildDerivedFields(clean);
}

function openRecordModal(row = null) {
  state.editingId = row ? row._rowId : null;
  const modal = document.getElementById("recordModal");
  const form = document.getElementById("recordForm");
  form.reset();
  setText("recordModalTitle", row ? "Edit Record" : "Add Record");

  if (row) {
    EDITABLE_FIELDS.forEach(field => {
      const input = form.elements[field];
      if (input) input.value = row[field] ?? "";
    });
  } else {
    form.elements["Flight Status"].value = "On Time";
  }

  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => form.elements["Gender"]?.focus(), 50);
}

function closeRecordModal() {
  const modal = document.getElementById("recordModal");
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  state.editingId = null;
}

function saveRecordFromForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const row = {};
  EDITABLE_FIELDS.forEach(field => { row[field] = String(form.elements[field]?.value ?? "").trim(); });
  const prepared = cleanEditableRow(row);

  if (!prepared.Gender || !prepared.Nationality || !prepared["Airport Name"] || !prepared["Country Name"] || !prepared.Continents || !prepared["Departure Date"] || !prepared["Arrival Airport"] || !prepared["Flight Status"] || !prepared.Age) {
    showToast("Please complete all record fields.");
    return;
  }

  if (state.editingId) {
    const index = state.rows.findIndex(item => item._rowId === state.editingId);
    if (index === -1) return;
    const updated = { ...state.rows[index], ...prepared, _rowId: state.editingId };
    state.rows[index] = updated;
    if (state.editingId.startsWith("new-")) {
      const addedIndex = state.changes.added.findIndex(item => item._rowId === state.editingId);
      if (addedIndex >= 0) state.changes.added[addedIndex] = updated;
    } else {
      state.changes.edited[state.editingId] = prepared;
    }
    showToast("Record updated.");
  } else {
    const newRow = {
      ...prepared,
      _rowId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };
    state.rows.push(newRow);
    state.changes.added.push(newRow);
    showToast("Record added.");
  }

  persistExplorerChanges();
  refreshAnalyticsFromRows();
  populateFilters();
  applyFilters();
  closeRecordModal();
}

function deleteRecord(row) {
  const label = `${row.Nationality || "record"} • ${row["Departure Date"] || ""}`;
  if (!window.confirm(`Delete this record?\n${label}`)) return;

  state.rows = state.rows.filter(item => item._rowId !== row._rowId);
  if (row._rowId.startsWith("new-")) {
    state.changes.added = state.changes.added.filter(item => item._rowId !== row._rowId);
  } else {
    if (!state.changes.deleted.includes(row._rowId)) state.changes.deleted.push(row._rowId);
    delete state.changes.edited[row._rowId];
  }

  persistExplorerChanges();
  refreshAnalyticsFromRows();
  populateFilters();
  applyFilters();
  showToast("Record deleted.");
}

function resetExplorerChanges() {
  const hasChanges = Object.keys(state.changes.edited).length || state.changes.deleted.length || state.changes.added.length;
  if (!hasChanges) {
    showToast("No saved changes to reset.");
    return;
  }
  if (!window.confirm("Reset all added, edited and deleted records and restore the original dataset?")) return;
  localStorage.removeItem(EXPLORER_STORAGE_KEY);
  window.location.reload();
}

function downloadFiltered() {
  if (!state.filteredRows.length) {
    showToast("There are no records to download.");
    return;
  }

  const exportRows = state.filteredRows.map(row => {
    const copy = { ...row };
    delete copy._rowId;
    return copy;
  });
  const csv = Papa.unparse(exportRows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "altair_current_data.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
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
