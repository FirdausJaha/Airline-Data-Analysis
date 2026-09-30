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

/*
 * Display labels for Age Group filter.
 *
 * IMPORTANT:
 * The actual values remain:
 * Child
 * Teenager
 * Young Adult
 * Adult
 * Senior
 *
 * Only the text shown to the user includes the age range.
 */
const AGE_GROUP_LABELS = {
  "Adult": "Adult (30–59)",
  "Child": "Child (1–12)",
  "Senior": "Senior (60–100)",
  "Teenager": "Teenager (13–19)",
  "Young Adult": "Young Adult (20–29)"
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
    sections.forEach(s =>
      s.classList.toggle("active-section", s.id === id)
    );

    links.forEach(l =>
      l.classList.toggle(
        "active",
        l.getAttribute("href") === `#${id}`
      )
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();

      activate(
        link.getAttribute("href").substring(1)
      );

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
    const dark =
      document.documentElement.dataset.theme === "dark";

    if (dark) {
      delete document.documentElement.dataset.theme;

      localStorage.setItem(
        "airline-theme",
        "light"
      );

      btn.textContent = "☾";
      updateChartsTheme();

    } else {
      document.documentElement.dataset.theme = "dark";

      localStorage.setItem(
        "airline-theme",
        "dark"
      );

      btn.textContent = "☀";
      updateChartsTheme();
    }
  });
}


function updateChartsTheme() {
  const text =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--muted")
      .trim() || "#68758a";

  const grid = "rgba(120,140,160,.12)";

  Object.values(state.charts).forEach(chart => {
    if (!chart) return;

    if (chart.options.plugins?.legend?.labels) {
      chart.options.plugins.legend.labels.color = text;
    }

    ["x", "y"].forEach(axis => {
      if (chart.options.scales?.[axis]) {

        if (chart.options.scales[axis].ticks) {
          chart.options.scales[axis].ticks.color = text;
        }

        if (
          chart.options.scales[axis].grid &&
          chart.options.scales[axis].grid.display !== false
        ) {
          chart.options.scales[axis].grid.color = grid;
        }
      }
    });

    chart.update("none");
  });
}


async function loadAnalysis() {
  try {
    const response =
      await fetch("data/analysis.json");

    if (!response.ok) {
      throw new Error(
        "Could not load analysis.json"
      );
    }

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
    showToast(
      "Could not load analysis data."
    );
  }
}


function formatNumber(n) {
  return Number(n).toLocaleString("en-IN");
}


function setText(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = value;
  }
}


function baseChartOptions(horizontal = false) {
  const text =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--muted")
      .trim() || "#68758a";

  return {
    responsive: true,
    maintainAspectRatio: false,

    plugins: {
      legend: {
        labels: {
          color: text,
          font: {
            size: 10
          }
        }
      }
    },

    scales: horizontal
      ? {
          x: {
            ticks: {
              color: text,
              font: {
                size: 9
              }
            },
            grid: {
              display: false
            }
          },

          y: {
            ticks: {
              color: text,
              font: {
                size: 9
              }
            },
            grid: {
              color: "rgba(120,140,160,.12)"
            }
          }
        }

      : {
          x: {
            ticks: {
              color: text,
              font: {
                size: 9
              }
            },
            grid: {
              display: false
            }
          },

          y: {
            ticks: {
              color: text,
              font: {
                size: 9
              }
            },
            grid: {
              color: "rgba(120,140,160,.12)"
            }
          }
        }
  };
}


function createChart(
  id,
  type,
  labels,
  datasets,
  options = {}
) {
  if (state.charts[id]) {
    state.charts[id].destroy();
  }

  const canvas =
    document.getElementById(id);

  if (!canvas) return;

  const finalOptions = {
    ...baseChartOptions(options.horizontal),
    ...options
  };

  state.charts[id] = new Chart(canvas, {
    type,

    data: {
      labels,
      datasets
    },

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

  setText(
    "kpiRecords",
    formatNumber(s.total_records)
  );

  setText(
    "kpiAge",
    s.average_age.toFixed(2)
  );

  setText(
    "kpiNationality",
    formatNumber(s.nationalities)
  );

  setText(
    "kpiAirports",
    formatNumber(s.airports)
  );

  setText(
    "kpiArrival",
    formatNumber(s.arrival_airports)
  );

  setText(
    "kpiContinents",
    s.continents
  );

  let x = simpleData(d.status);

  createChart(
    "statusChart",
    "doughnut",
    x.labels,
    [
      {
        data: x.values,

        backgroundColor:
          x.labels.map(
            x =>
              statusColors[x] ||
              COLORS[0]
          ),

        borderWidth: 0
      }
    ],
    {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  );

  x = simpleData(d.continent);

  createChart(
    "continentChart",
    "bar",
    x.labels,
    [
      {
        label: "Passengers",
        data: x.values,
        backgroundColor: COLORS
      }
    ]
  );

  x = simpleData(d.age_histogram);

  createChart(
    "ageChart",
    "bar",
    x.labels,
    [
      {
        label: "Passengers",
        data: x.values,
        backgroundColor: "#2563eb"
      }
    ]
  );

  x = simpleData(d.month);

  createChart(
    "monthChart",
    "line",
    x.labels,
    [
      {
        label: "Flights",
        data: x.values,
        borderColor: "#06b6d4",
        backgroundColor:
          "rgba(6,182,212,.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 3
      }
    ]
  );
}


function renderPassengers() {
  const d = state.data;
  const s = d.summary;

  setText(
    "statMeanAge",
    s.average_age.toFixed(2)
  );

  setText(
    "statMedianAge",
    s.median_age.toFixed(2)
  );

  setText(
    "statMinAge",
    s.minimum_age
  );

  setText(
    "statMaxAge",
    s.maximum_age
  );

  let x = simpleData(d.gender);

  createChart(
    "genderChart",
    "doughnut",
    x.labels,
    [
      {
        data: x.values,
        backgroundColor: [
          "#2563eb",
          "#ec4899"
        ],
        borderWidth: 0
      }
    ],
    {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  );

  x = simpleData(d.age_group);

  createChart(
    "ageGroupChart",
    "bar",
    x.labels,
    [
      {
        label: "Passengers",
        data: x.values,
        backgroundColor: COLORS
      }
    ]
  );

  x = simpleData(d.nationality_top10);

  createChart(
    "nationalityChart",
    "bar",
    x.labels.reverse(),
    [
      {
        label: "Passengers",
        data: x.values.reverse(),
        backgroundColor: "#2563eb"
      }
    ],
    {
      indexAxis: "y"
    }
  );

  x = simpleData(d.age_histogram);

  createChart(
    "ageHistChart",
    "bar",
    x.labels,
    [
      {
        label: "Passengers",
        data: x.values,
        backgroundColor: "#8b5cf6"
      }
    ]
  );
}


function renderFlights() {
  const d = state.data;

  const total =
    d.summary.total_records;

  const statusCards =
    document.getElementById(
      "statusCards"
    );

  statusCards.innerHTML = "";

  d.status.forEach(item => {
    const pct =
      (
        item.value /
        total *
        100
      ).toFixed(2);

    const card =
      document.createElement("div");

    card.className =
      "status-card";

    card.innerHTML = `
      <small>${escapeHtml(item.label)}</small>
      <strong>${formatNumber(item.value)}</strong>
      <span>${pct}% of records</span>
    `;

    statusCards.appendChild(card);
  });

  createCrossTabChart(
    "genderStatusChart",
    d.gender_status
  );

  createCrossTabChart(
    "ageStatusChart",
    d.age_status
  );

  createCrossTabChart(
    "continentStatusChart",
    d.continent_status
  );

  createCrossTabChart(
    "domesticStatusChart",
    d.domestic_status
  );
}


function createCrossTabChart(
  id,
  payload
) {
  createChart(
    id,
    "bar",
    payload.categories,

    payload.series.map(
      series => ({
        label: series.name,
        data: series.data,
        backgroundColor:
          statusColors[
            series.name
          ] || COLORS[0]
      })
    ),

    {
      scales: {
        x: {
          stacked: true
        },

        y: {
          stacked: true
        }
      }
    }
  );
}


function renderGeography() {
  const d = state.data;

  let x = simpleData(d.continent);

  createChart(
    "geoContinentChart",
    "polarArea",
    x.labels,
    [
      {
        data: x.values,

        backgroundColor:
          COLORS.map(
            c => c + "cc"
          ),

        borderWidth: 0
      }
    ],
    {
      scales: {
        r: {
          ticks: {
            display: false
          }
        }
      }
    }
  );

  x = simpleData(
    d.country_top10
  );

  createChart(
    "countryChart",
    "bar",
    x.labels.reverse(),
    [
      {
        label: "Records",
        data: x.values.reverse(),
        backgroundColor: "#06b6d4"
      }
    ],
    {
      indexAxis: "y"
    }
  );

  const table =
    document.getElementById(
      "continentAgeTable"
    );

  table.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">

        <thead>
          <tr>
            <th>Continent</th>
            <th>Average Age</th>
          </tr>
        </thead>

        <tbody>
          ${d.avg_age_continent.map(x => `
            <tr>
              <td>${escapeHtml(x.label)}</td>
              <td>${x.value.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>

      </table>
    </div>
  `;
}


function renderTime() {
  const d = state.data;

  let x = simpleData(d.year);

  createChart(
    "yearChart",
    "line",
    x.labels,
    [
      {
        label: "Flights",
        data: x.values,
        borderColor: "#2563eb",
        backgroundColor:
          "rgba(37,99,235,.12)",
        fill: true,
        tension: 0.3
      }
    ]
  );

  x = simpleData(
    d.day_of_week
  );

  createChart(
    "dayChart",
    "bar",
    x.labels,
    [
      {
        label: "Flights",
        data: x.values,
        backgroundColor: "#8b5cf6"
      }
    ]
  );

  createChart(
    "statusMonthChart",
    "line",
    d.status_month.categories,

    d.status_month.series.map(
      s => ({
        label: s.name,
        data: s.data,

        borderColor:
          statusColors[
            s.name
          ] || COLORS[0],

        backgroundColor:
          "transparent",

        tension: 0.25,
        pointRadius: 2
      })
    )
  );
}


function renderAirports() {
  const d = state.data;

  let x = simpleData(
    d.airport_top10
  );

  createChart(
    "airportChart",
    "bar",
    x.labels.reverse(),
    [
      {
        label: "Records",
        data: x.values.reverse(),
        backgroundColor: "#2563eb"
      }
    ],
    {
      indexAxis: "y"
    }
  );

  x = simpleData(
    d.arrival_top10
  );

  createChart(
    "arrivalChart",
    "bar",
    x.labels.reverse(),
    [
      {
        label: "Records",
        data: x.values.reverse(),
        backgroundColor: "#06b6d4"
      }
    ],
    {
      indexAxis: "y"
    }
  );
}


function renderStatistics() {
  const d = state.data;
  const s = d.summary;

  setText(
    "sMean",
    s.average_age.toFixed(2)
  );

  setText(
    "sMedian",
    s.median_age.toFixed(2)
  );

  setText(
    "sMin",
    s.minimum_age
  );

  setText(
    "sMax",
    s.maximum_age
  );

  setText(
    "sStd",
    s.std_age.toFixed(2)
  );

  const tests = [
    [
      "Gender vs Flight Status",
      d.statistics.gender_vs_status
    ],

    [
      "Continent vs Flight Status",
      d.statistics.continent_vs_status
    ],

    [
      "Age Group vs Flight Status",
      d.statistics.age_group_vs_status
    ],

    [
      "Domestic/International vs Flight Status",
      d.statistics.domestic_vs_status
    ]
  ];

  const tbody =
    document.querySelector(
      "#chiTable tbody"
    );

  tbody.innerHTML =
    tests.map(
      ([name, t]) => `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${t.chi2.toLocaleString()}</td>
          <td>${formatP(t.p_value)}</td>
          <td>${t.degrees_of_freedom}</td>
          <td>
            ${
              t.significant_at_0_05
                ? "Significant association"
                : "Not significant"
            }
          </td>
        </tr>
      `
    ).join("");
}


function formatP(p) {
  if (p === 0) {
    return "< 0.000001";
  }

  if (p < 0.000001) {
    return p.toExponential(2);
  }

  return p.toFixed(6);
}


function renderInsights() {
  const grid =
    document.getElementById(
      "insightGrid"
    );

  grid.innerHTML =
    state.data.insights.map(
      item => `
        <article class="insight-card">

          <div class="insight-icon">
            ${item.icon}
          </div>

          <h3>
            ${escapeHtml(item.title)}
          </h3>

          <p>
            ${escapeHtml(item.text)}
          </p>

        </article>
      `
    ).join("");
}


function normalizeValue(value) {
  return String(
    value ?? ""
  ).trim().toLowerCase();
}


function uniqueValues(field) {
  return [
    ...new Set(
      state.rows
        .map(
          row =>
            String(
              row[field] ?? ""
            ).trim()
        )
        .filter(Boolean)
    )
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        undefined,
        {
          sensitivity: "base",
          numeric: true
        }
      )
  );
}


function fillSelect(
  id,
  values,
  keepValue = ""
) {
  const select =
    document.getElementById(id);

  if (!select) return;

  select.innerHTML =
    '<option value="">All</option>';

  values.forEach(value => {
    const option =
      document.createElement(
        "option"
      );

    /*
     * Keep the actual value unchanged.
     * Only change what the user sees.
     */
    option.value = value;

    if (id === "ageFilter") {
      option.textContent =
        AGE_GROUP_LABELS[value] ||
        value;
    } else {
      option.textContent =
        value;
    }

    select.appendChild(option);
  });

  if (values.includes(keepValue)) {
    select.value = keepValue;
  }
}


function populateFilters() {
  const current = {
    gender:
      document.getElementById(
        "genderFilter"
      )?.value || "",

    continent:
      document.getElementById(
        "continentFilter"
      )?.value || "",

    status:
      document.getElementById(
        "statusFilter"
      )?.value || "",

    age:
      document.getElementById(
        "ageFilter"
      )?.value || ""
  };

  fillSelect(
    "genderFilter",
    uniqueValues("Gender"),
    current.gender
  );

  fillSelect(
    "continentFilter",
    uniqueValues("Continents"),
    current.continent
  );

  fillSelect(
    "statusFilter",
    uniqueValues("Flight Status"),
    current.status
  );

  fillSelect(
    "ageFilter",
    uniqueValues("Age Group"),
    current.age
  );
}


function setupExplorer() {
  document
    .getElementById("applyFilters")
    .addEventListener(
      "click",
      applyFilters
    );

  document
    .getElementById("clearFilters")
    .addEventListener(
      "click",
      clearFilters
    );

  document
    .getElementById("downloadFiltered")
    .addEventListener(
      "click",
      downloadFiltered
    );

  document
    .getElementById("addRecord")
    .addEventListener(
      "click",
      () => openRecordModal()
    );

  document
    .getElementById("resetData")
    .addEventListener(
      "click",
      resetExplorerChanges
    );

  document
    .getElementById("prevPage")
    .addEventListener(
      "click",
      () => {
        if (state.page > 1) {
          state.page--;
          renderTable();
        }
      }
    );

  document
    .getElementById("nextPage")
    .addEventListener(
      "click",
      () => {
        const maxPage =
          Math.max(
            1,
            Math.ceil(
              state.filteredRows.length /
              state.pageSize
            )
          );

        if (state.page < maxPage) {
          state.page++;
          renderTable();
        }
      }
    );

  const searchInput =
    document.getElementById(
      "searchInput"
    );

  let timer;

  searchInput.addEventListener(
    "input",
    () => {
      clearTimeout(timer);

      timer = setTimeout(
        applyFilters,
        180
      );
    }
  );

  document
    .getElementById(
      "closeRecordModal"
    )
    .addEventListener(
      "click",
      closeRecordModal
    );

  document
    .getElementById(
      "cancelRecord"
    )
    .addEventListener(
      "click",
      closeRecordModal
    );

  document
    .getElementById(
      "recordModal"
    )
    .addEventListener(
      "click",
      event => {
        if (
          event.target.id ===
          "recordModal"
        ) {
          closeRecordModal();
        }
      }
    );

  document
    .getElementById(
      "recordForm"
    )
    .addEventListener(
      "submit",
      saveRecordFromForm
    );
}


function loadExplorerChanges() {
  try {
    const raw =
      localStorage.getItem(
        EXPLORER_STORAGE_KEY
      );

    if (!raw) {
      return {
        edited: {},
        deleted: [],
        added: []
      };
    }

    const parsed =
      JSON.parse(raw);

    return {
            edited:
        parsed.edited &&
        typeof parsed.edited === "object"
          ? parsed.edited
          : {},

      deleted:
        Array.isArray(
          parsed.deleted
        )
          ? parsed.deleted
          : [],

      added:
        Array.isArray(
          parsed.added
        )
          ? parsed.added
          : []
    };

  } catch (error) {
    console.warn(
      "Could not restore saved data changes",
      error
    );

    return {
      edited: {},
      deleted: [],
      added: []
    };
  }
}


function persistExplorerChanges() {
  localStorage.setItem(
    EXPLORER_STORAGE_KEY,
    JSON.stringify(
      state.changes
    )
  );
}


function applySavedChanges(
  baseRows
) {
  const deleted =
    new Set(
      state.changes.deleted
    );

  const edited =
    state.changes.edited || {};

  const rows =
    baseRows
      .filter(
        row =>
          !deleted.has(
            row._rowId
          )
      )
      .map(
        row =>
          edited[row._rowId]
            ? {
                ...row,
                ...edited[
                  row._rowId
                ]
              }
            : row
      );

  const added =
    (
      state.changes.added ||
      []
    ).map(
      row => ({
        ...row
      })
    );

  return rows.concat(
    added
  );
}


async function loadExplorerData() {
  return new Promise(
    (resolve, reject) => {

      Papa.parse(
        "data/airline_cleaned.csv",
        {
          download: true,
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,

          complete: results => {

            if (
              results.errors &&
              results.errors.length
            ) {
              console.warn(
                "CSV parse warnings",
                results.errors.slice(
                  0,
                  3
                )
              );
            }

            const baseRows =
              (
                results.data ||
                []
              )
                .filter(
                  row =>
                    row &&
                    Object.values(row)
                      .some(
                        value =>
                          String(
                            value ?? ""
                          ).trim() !== ""
                      )
                )
                .map(
                  (row, index) => {

                    const prepared =
                      buildDerivedFields(
                        row
                      );

                    return {
                      ...prepared,
                      _rowId:
                        `base-${index}`
                    };
                  }
                );

            state.changes =
              loadExplorerChanges();

            state.rows =
              applySavedChanges(
                baseRows
              );

            state.filteredRows =
              [
                ...state.rows
              ];

            populateFilters();
            renderTable();

            resolve();
          },

          error: error =>
            reject(error)
        }
      );
    }
  );
}


function applyFilters() {
  const search =
    normalizeValue(
      document.getElementById(
        "searchInput"
      ).value
    );

  const gender =
    normalizeValue(
      document.getElementById(
        "genderFilter"
      ).value
    );

  const continent =
    normalizeValue(
      document.getElementById(
        "continentFilter"
      ).value
    );

  const status =
    normalizeValue(
      document.getElementById(
        "statusFilter"
      ).value
    );

  const age =
    normalizeValue(
      document.getElementById(
        "ageFilter"
      ).value
    );

  state.filteredRows =
    state.rows.filter(
      row => {

        const allFields =
          Object.entries(row)
            .filter(
              ([key]) =>
                key !== "_rowId"
            )
            .map(
              ([, value]) =>
                normalizeValue(value)
            )
            .join(" ");

        return (
          (!search ||
            allFields.includes(
              search
            )) &&

          (!gender ||
            normalizeValue(
              row["Gender"]
            ) === gender) &&

          (!continent ||
            normalizeValue(
              row["Continents"]
            ) === continent) &&

          (!status ||
            normalizeValue(
              row["Flight Status"]
            ) === status) &&

          (!age ||
            normalizeValue(
              row["Age Group"]
            ) === age)
        );
      }
    );

  state.page = 1;

  renderTable();

  setText(
    "tableCount",
    `${formatNumber(
      state.filteredRows.length
    )} matching records`
  );
}


function clearFilters() {
  document.getElementById(
    "searchInput"
  ).value = "";

  [
    "genderFilter",
    "continentFilter",
    "statusFilter",
    "ageFilter"
  ].forEach(
    id => {
      document.getElementById(
        id
      ).value = "";
    }
  );

  state.filteredRows =
    [
      ...state.rows
    ];

  state.page = 1;

  renderTable();
}


function renderTable() {
  const table =
    document.getElementById(
      "dataTable"
    );

  const thead =
    table.querySelector(
      "thead"
    );

  const tbody =
    table.querySelector(
      "tbody"
    );

  thead.innerHTML = `
    <tr>
      ${TABLE_COLUMNS.map(
        c =>
          `<th>${escapeHtml(c)}</th>`
      ).join("")}
      <th>Actions</th>
    </tr>
  `;

  const start =
    (state.page - 1) *
    state.pageSize;

  const pageRows =
    state.filteredRows.slice(
      start,
      start + state.pageSize
    );

  tbody.innerHTML =
    pageRows.map(
      row => `
        <tr>

          ${TABLE_COLUMNS.map(
            c =>
              `<td>${escapeHtml(
                row[c] ?? ""
              )}</td>`
          ).join("")}

          <td class="table-actions">

            <button
              class="table-action edit"
              data-action="edit"
              data-row-id="${escapeHtml(
                row._rowId
              )}">
              Edit
            </button>

            <button
              class="table-action delete"
              data-action="delete"
              data-row-id="${escapeHtml(
                row._rowId
              )}">
              Delete
            </button>

          </td>

        </tr>
      `
    ).join("");

  tbody
    .querySelectorAll(
      ".table-action"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const row =
            state.rows.find(
              item =>
                item._rowId ===
                button.dataset.rowId
            );

          if (!row) return;

          if (
            button.dataset.action ===
            "edit"
          ) {
            openRecordModal(row);
          } else {
            deleteRecord(row);
          }
        }
      );
    });

  const maxPage =
    Math.max(
      1,
      Math.ceil(
        state.filteredRows.length /
        state.pageSize
      )
    );

  if (
    state.page >
    maxPage
  ) {
    state.page =
      maxPage;
  }

  setText(
    "tableCount",
    `${formatNumber(
      state.filteredRows.length
    )} matching records`
  );

  setText(
    "pageInfo",
    `Page ${state.page} of ${maxPage}`
  );
}


function buildDerivedFields(row) {
  const result = {
    ...row
  };

  const age =
    Number(result.Age);

  /*
   * Age Group ranges:
   *
   * Child       = 1–12
   * Teenager    = 13–19
   * Young Adult = 20–29
   * Adult       = 30–59
   * Senior      = 60–100
   */

  if (
    Number.isFinite(age) &&
    age >= 1 &&
    age <= 100
  ) {

    result.Age =
      String(
        Math.round(age)
      );

    if (age <= 12) {
      result["Age Group"] =
        "Child";

    } else if (age <= 19) {
      result["Age Group"] =
        "Teenager";

    } else if (age <= 29) {
      result["Age Group"] =
        "Young Adult";

    } else if (age <= 59) {
      result["Age Group"] =
        "Adult";

    } else {
      result["Age Group"] =
        "Senior";
    }

  } else {
    result["Age Group"] =
      "";
  }

  const dateText =
    String(
      result["Departure Date"] ||
      ""
    ).trim();

  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(
      dateText
    )
      ? new Date(
          `${dateText}T00:00:00Z`
        )
      : null;

  if (
    date &&
    !Number.isNaN(
      date.getTime()
    )
  ) {

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ];

    result["Departure Year"] =
      String(
        date.getUTCFullYear()
      );

    result["Departure Month"] =
      String(
        date.getUTCMonth() + 1
      );

    result["Departure Month Name"] =
      monthNames[
        date.getUTCMonth()
      ];

    result["Departure Day"] =
      String(
        date.getUTCDate()
      );

    result["Day of Week"] =
      dayNames[
        date.getUTCDay()
      ];

    result["Weekend/Weekday"] =
      date.getUTCDay() >= 5
        ? "Weekend"
        : "Weekday";
  }

  const nationality =
    normalizeValue(
      result.Nationality
    );

  const country =
    normalizeValue(
      result["Country Name"]
    );

  if (
    nationality &&
    country
  ) {
    result[
      "Domestic/International"
    ] =
      nationality === country
        ? "Domestic"
        : "International";
  }

  return result;
}


function cleanEditableRow(row) {
  const clean = {};

  EDITABLE_FIELDS.forEach(
    field => {
      clean[field] =
        row[field] ?? "";
    }
  );

  return buildDerivedFields(
    clean
  );
}


function openRecordModal(
  row = null
) {
  state.editingId =
    row
      ? row._rowId
      : null;

  const modal =
    document.getElementById(
      "recordModal"
    );

  const form =
    document.getElementById(
      "recordForm"
    );

  form.reset();

  setText(
    "recordModalTitle",
    row
      ? "Edit Record"
      : "Add Record"
  );

  if (row) {

    EDITABLE_FIELDS.forEach(
      field => {

        const input =
          form.elements[
            field
          ];

        if (input) {
          input.value =
            row[field] ?? "";
        }
      }
    );

  } else {

    form.elements[
      "Flight Status"
    ].value =
      "On Time";
  }

  modal.classList.add(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  setTimeout(
    () =>
      form.elements[
        "Gender"
      ]?.focus(),
    50
  );
}


function closeRecordModal() {
  const modal =
    document.getElementById(
      "recordModal"
    );

  modal.classList.remove(
    "show"
  );

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  state.editingId =
    null;
}


function saveRecordFromForm(
  event
) {
  event.preventDefault();

  const form =
    event.currentTarget;

  const row = {};

  EDITABLE_FIELDS.forEach(
    field => {
      row[field] =
        String(
          form.elements[
            field
          ]?.value ?? ""
        ).trim();
    }
  );

  const prepared =
    cleanEditableRow(row);

  if (
    !prepared.Gender ||
    !prepared.Nationality ||
    !prepared["Airport Name"] ||
    !prepared["Country Name"] ||
    !prepared.Continents ||
    !prepared["Departure Date"] ||
    !prepared["Arrival Airport"] ||
    !prepared["Flight Status"] ||
    !prepared.Age
  ) {

    showToast(
      "Please complete all record fields."
    );

    return;
  }

  if (state.editingId) {

    const index =
      state.rows.findIndex(
        item =>
          item._rowId ===
          state.editingId
      );

    if (index === -1) return;

    const updated = {
      ...state.rows[index],
      ...prepared,
      _rowId:
        state.editingId
    };

    state.rows[index] =
      updated;

    if (
      state.editingId.startsWith(
        "new-"
      )
    ) {

      const addedIndex =
        state.changes.added.findIndex(
          item =>
            item._rowId ===
            state.editingId
        );

      if (
        addedIndex >= 0
      ) {
        state.changes.added[
          addedIndex
        ] = updated;
      }

    } else {

      state.changes.edited[
        state.editingId
      ] = prepared;
    }

    showToast(
      "Record updated."
    );

  } else {

    const newRow = {
      ...prepared,

      _rowId:
        `new-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
    };

    state.rows.push(
      newRow
    );

    state.changes.added.push(
      newRow
    );

    showToast(
      "Record added."
    );
  }

  persistExplorerChanges();

  populateFilters();

  applyFilters();

  closeRecordModal();
}


function deleteRecord(row) {
  const label =
    `${row.Nationality || "record"} • ${
      row["Departure Date"] || ""
    }`;

  if (
    !window.confirm(
      `Delete this record?\n${label}`
    )
  ) {
    return;
  }

  state.rows =
    state.rows.filter(
      item =>
        item._rowId !==
        row._rowId
    );

  if (
    row._rowId.startsWith(
      "new-"
    )
  ) {

    state.changes.added =
      state.changes.added.filter(
        item =>
          item._rowId !==
          row._rowId
      );

  } else {

    if (
      !state.changes.deleted.includes(
        row._rowId
      )
    ) {
      state.changes.deleted.push(
        row._rowId
      );
    }

    delete state.changes.edited[
      row._rowId
    ];
  }

  persistExplorerChanges();

  populateFilters();

  applyFilters();

  showToast(
    "Record deleted."
  );
}


function resetExplorerChanges() {
  const hasChanges =
    Object.keys(
      state.changes.edited
    ).length ||
    state.changes.deleted.length ||
    state.changes.added.length;

  if (!hasChanges) {
    showToast(
      "No saved changes to reset."
    );
    return;
  }

  if (
    !window.confirm(
      "Reset all added, edited and deleted records and restore the original dataset?"
    )
  ) {
    return;
  }

  localStorage.removeItem(
    EXPLORER_STORAGE_KEY
  );

  window.location.reload();
}


function downloadFiltered() {
  if (
    !state.filteredRows.length
  ) {
    showToast(
      "There are no records to download."
    );

    return;
  }

  const exportRows =
    state.filteredRows.map(
      row => {

        const copy = {
          ...row
        };

        delete copy._rowId;

        return copy;
      }
    );

  const csv =
    Papa.unparse(
      exportRows
    );

  const blob =
    new Blob(
      [csv],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      "a"
    );

  a.href = url;

  a.download =
    "altair_current_data.csv";

  document.body.appendChild(
    a
  );

  a.click();

  a.remove();

  URL.revokeObjectURL(
    url
  );
}


function escapeHtml(value) {
  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function showToast(message) {
  const toast =
    document.getElementById(
      "toast"
    );

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );

  setTimeout(
    () =>
      toast.classList.remove(
        "show"
      ),
    2200
  );
}
