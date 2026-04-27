// api: 08b7268e73f8f692a0920d7f
// news api: c63ced5be1c54b0da57026e4c9ed2c58

const API_KEY = '08b7268e73f8f692a0920d7f'; 
const NEWS_API_KEY = 'c63ced5be1c54b0da57026e4c9ed2c58'; 

let baseCurrency = 'USD';
let watchlist = ['ZAR', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'XAU', 'XAG'];
let allRates = {};
let previousRates = {};
let chartInstance = null;
let activeChartCurrency = null;
let activeDays = 7;

// ── NAVIGATION ──
function initNav() {
  const navBtns = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${target}`).classList.add('active');
      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (target === 'news') fetchNews();
    });
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('page-rates').classList.add('active');
    navBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('[data-page="rates"]').classList.add('active');
  });
}

// ── RATES ──
async function fetchRates() {
  try {
    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`
    );
    const data = await res.json();
    previousRates = { ...allRates };
    allRates = data.conversion_rates;
    displayRates();
    updateTimestamp();
  } catch (err) {
    console.error('Failed to fetch rates:', err);
  }
}

function displayRates() {
  const container = document.getElementById('rates-container');
  container.innerHTML = '';
  document.getElementById('base-label').textContent = baseCurrency;

  watchlist.forEach(currency => {
    if (currency === baseCurrency) return;

    const rate = allRates[currency];
    const prev = previousRates[currency];
    if (!rate) return;

    // % change
    let changeHTML = '<span class="change">--</span>';
    if (prev && prev !== rate) {
      const pct = (((rate - prev) / prev) * 100).toFixed(3);
      const isPositive = pct >= 0;
      const arrow = isPositive ? '▲' : '▼';
      const cls = isPositive ? 'positive' : 'negative';
      changeHTML = `<span class="change ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
    }

    const label = currency === 'XAU'
      ? 'Gold (XAU)'
      : currency === 'XAG'
      ? 'Silver (XAG)'
      : `${baseCurrency}/${currency}`;

    const card = document.createElement('div');
    card.classList.add('rate-card');
    card.innerHTML = `
      <div class="symbol">${label}</div>
      <div class="price">${rate.toFixed(4)}</div>
      ${changeHTML}
      <button class="view-chart-btn" data-currency="${currency}">📈 View Chart</button>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll('.view-chart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const currency = btn.dataset.currency;
      openChartPage(currency, 7);
    });
  });
}

function updateTimestamp() {
  document.getElementById('last-updated').textContent =
    `Last updated: ${new Date().toLocaleTimeString()}`;
}

// ── CHART ────────────────────────────────────────────────
function openChartPage(currency, days) {
  if (currency === 'XAU' || currency === 'XAG') {
    alert('Historical chart data is not available for Gold/Silver on the free plan.');
    return;
  }
  activeChartCurrency = currency;
  activeDays = days;

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-chart').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const label = currency === 'XAU'
    ? 'Gold (XAU)'
    : currency === 'XAG'
    ? 'Silver (XAG)'
    : `${baseCurrency}/${currency}`;
  document.getElementById('chart-title').textContent = label;

  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.days) === days);
  });

  fetchChartData(currency, days);
}

async function fetchChartData(currency, days) {
  const ctx = document.getElementById('forex-chart').getContext('2d');
  const labels = [];
  const values = [];

  if (chartInstance) chartInstance.destroy();
  chartInstance = null;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);

  const format = (d) => d.toISOString().split('T')[0];

  // CORS proxy wraps the Frankfurter request
  const target = `https://api.frankfurter.app/${format(startDate)}..${format(today)}?from=${baseCurrency}&to=${currency}`;
  const proxy = `https://corsproxy.io/?url=${encodeURIComponent(target)}`;

  try {
    const res = await fetch(proxy);
    const data = await res.json();

    if (!data.rates) {
      console.error('No rate data:', data);
      return;
    }

    Object.entries(data.rates).forEach(([date, rateObj]) => {
      labels.push(date.slice(5));
      values.push(rateObj[currency]);
    });

    renderChart(ctx, labels, values, currency);

  } catch (err) {
    console.error('Chart fetch error:', err);
  }
}

function renderChart(ctx, labels, values, currency) {
  if (chartInstance) chartInstance.destroy();

  const isUp = values[values.length - 1] >= values[0];
  const lineColor = isUp ? '#3fb950' : '#f85149';
  const fillColor = isUp ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)';

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${baseCurrency}/${currency}`,
        data: values,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: values.length > 30 ? 0 : 3,
        pointBackgroundColor: lineColor,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e6edf3' } },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } },
        y: { ticks: { color: '#8b949e' }, grid: { color: '#30363d' } }
      }
    }
  });
}

function initTimeButtons() {
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeDays = parseInt(btn.dataset.days);
      if (activeChartCurrency) fetchChartData(activeChartCurrency, activeDays);
    });
  });
}

// ── NEWS ─────────────────────────────────────────────────
async function fetchNews() {
  const container = document.getElementById('news-container');
  container.innerHTML = '<p class="loading-text">Loading news...</p>';

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=forex+currency&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`
    );
    const data = await res.json();

    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = '<p class="loading-text">No news found.</p>';
      return;
    }

    container.innerHTML = '';
    data.articles.forEach(article => {
      const card = document.createElement('div');
      card.classList.add('news-card');
      card.innerHTML = `
        <h3>${article.title}</h3>
        <p>${article.description ?? ''}</p>
        <a href="${article.url}" target="_blank">Read more →</a>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<p class="loading-text">Failed to load news.</p>';
    console.error('News fetch error:', err);
  }
}

// ── CONVERTER ────────────────────────────────────────────
function initConverter() {
  document.getElementById('convert-btn').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('amount').value);
    const from = document.getElementById('from-currency').value;
    const to = document.getElementById('to-currency').value;

    if (!allRates[from] || !allRates[to]) {
      alert('Rates not loaded yet, please wait...');
      return;
    }

    const inBase = amount / allRates[from];
    const result = (inBase * allRates[to]).toFixed(4);
    document.getElementById('converter-result').textContent =
      `${amount} ${from} = ${result} ${to}`;
  });
}

// ── SETTINGS ─────────────────────────────────────────────
function initSettings() {
  document.getElementById('apply-base').addEventListener('click', () => {
    baseCurrency = document.getElementById('base-currency').value;
    fetchRates();
    alert(`Base currency changed to ${baseCurrency}`);
  });

  document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light');
    const isLight = document.body.classList.contains('light');
    document.getElementById('theme-toggle').textContent =
      isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme';
  });

  document.getElementById('apply-watchlist').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#watchlist-manager input[type="checkbox"]');
    watchlist = [];
    checkboxes.forEach(cb => { if (cb.checked) watchlist.push(cb.value); });
    fetchRates();
    alert('Watchlist updated!');
  });
}

// ── INIT ─────────────────────────────────────────────────
window.onload = function () {
  initNav();
  initConverter();
  initSettings();
  initTimeButtons();
  fetchRates();
  setInterval(fetchRates, 60000);
};