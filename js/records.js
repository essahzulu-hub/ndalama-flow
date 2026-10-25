/* Records: totals plus everything derived from them — dashboard, weekly chart,
   expense categories, readiness, recent activity and the officer summary. */
window.NF = window.NF || {};

NF.records = (() => {
  const core = NF.core;
  const state = core.state;
  const { icon, money, axisMoney, escapeHtml } = core;

  function totals() {
    const income = state.transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expenses = state.transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { income, expenses, profit: income - expenses };
  }

  function expenseCategories() {
    const buckets = new Map();
    state.transactions.filter((item) => item.type === "expense").forEach((item) => {
      buckets.set(item.category, (buckets.get(item.category) || 0) + item.amount);
    });
    return [...buckets.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  }

  function refresh() {
    const values = totals();
    [["mini-income", values.income], ["dash-income", values.income], ["officer-income", values.income],
      ["mini-expenses", values.expenses], ["dash-expenses", values.expenses], ["officer-expenses", values.expenses],
      ["mini-profit", values.profit], ["dash-profit", values.profit], ["officer-profit", values.profit]
    ].forEach(([id, amount]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = money(amount);
    });
    renderDashboard(values);
    renderReadiness();
    renderTransactions();
    renderOfficerTransactions();
    renderOfficerSummary(values);
  }

  function renderDashboard(values) {
    const entries = state.transactions.length;
    const categories = expenseCategories();
    const incomeNote = document.getElementById("dash-income-note");
    const expenseNote = document.getElementById("dash-expense-note");
    if (incomeNote) {
      incomeNote.innerHTML = entries
        ? `<span class="muted-text">${entries} recorded ${entries === 1 ? "entry" : "entries"}</span>`
        : `<span class="muted-text">Nothing recorded yet</span>`;
    }
    if (expenseNote) {
      expenseNote.innerHTML = categories.length
        ? `<span class="muted-text">Across ${categories.length} ${categories.length === 1 ? "category" : "categories"}</span>`
        : `<span class="muted-text">Nothing recorded yet</span>`;
    }
    document.querySelectorAll(".sparkline").forEach((spark) => spark.classList.toggle("hidden", !entries));
    const meter = document.getElementById("profit-meter-fill");
    if (meter) meter.style.width = `${values.income > 0 ? Math.max(0, Math.min(100, (values.profit / values.income) * 100)) : 0}%`;
    renderChart(values);
    renderCategories(categories);
  }

  function niceMax(values) {
    const peak = Math.max(values.income, values.expenses, 1);
    const step = Math.ceil(peak / 4 / 50) * 50;
    return step * 4;
  }

  function renderChart(values) {
    const entries = state.transactions.length;
    const top = niceMax(values);
    const labels = document.querySelectorAll(".chart-wrap .y-axis span");
    [top, top * 0.75, top * 0.5, top * 0.25].forEach((value, index) => {
      if (labels[index]) labels[index].textContent = axisMoney(value);
    });
    const groups = document.querySelectorAll("#bar-groups .bar-group");
    groups.forEach((group, index) => {
      const last = index === groups.length - 1;
      const incomeBar = group.querySelector(".income-bar");
      const expenseBar = group.querySelector(".expense-bar");
      if (incomeBar) incomeBar.style.height = `${last && entries ? Math.min(100, (values.income / top) * 100) : 0}%`;
      if (expenseBar) expenseBar.style.height = `${last && entries ? Math.min(100, (values.expenses / top) * 100) : 0}%`;
    });
    document.querySelector("#bar-groups").classList.toggle("is-empty", !entries);
    document.querySelector("#chart-empty").classList.toggle("hidden", Boolean(entries));
  }

  function renderCategories(categories) {
    const list = document.getElementById("category-list");
    if (!list) return;
    if (!categories.length) {
      list.innerHTML = `<p class="empty-note">Nothing recorded yet. Add an expense in chat to see where your money goes.</p>`;
      return;
    }
    const peak = Math.max(...categories.map((item) => item.amount));
    const tints = ["category-transport", "category-stock", "category-rent", "category-other"];
    const glyphs = { Transport: "swap", Rent: "lock", "Stock & supplies": "store" };
    list.innerHTML = categories.map((item, index) => `
      <div class="category-row">
        <span class="category-icon ${tints[index % tints.length]}">${icon(glyphs[item.name] || "out")}</span>
        <span class="category-name">${escapeHtml(item.name)}</span>
        <div class="category-progress"><i style="width:${Math.round((item.amount / peak) * 100)}%"></i></div>
        <strong>${money(item.amount)}</strong>
      </div>`).join("");
  }

  function renderReadiness() {
    const entries = state.transactions.length;
    const ready = entries >= core.MIN_ENTRIES;
    const percent = ready ? core.ILLUSTRATIVE_SCORE : 0;
    const ring = ready ? `conic-gradient(var(--green) 0 ${percent}%, #eaf1ed ${percent}% 100%)` : "conic-gradient(#dfe7e2 0 100%)";
    ["ready-ring", "aside-ring"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.style.background = ring;
    });
    document.getElementById("ready-score").textContent = ready ? core.ILLUSTRATIVE_SCORE : "--";
    document.getElementById("aside-score").textContent = ready ? core.ILLUSTRATIVE_SCORE : "--";
    document.getElementById("ready-progress").style.width = `${percent}%`;
    document.getElementById("aside-progress").style.width = `${percent}%`;
    document.getElementById("ready-status").textContent = ready ? "Almost ready" : "Not enough records";
    document.getElementById("aside-status").textContent = ready ? "Almost ready" : "Not enough records";
    document.getElementById("ready-title").textContent = ready ? "A promising start" : "Just getting started";
    document.getElementById("ready-copy").textContent = ready
      ? "Your recorded entries show money coming in. A longer record can make this picture more useful."
      : `Nothing recorded yet. Add at least ${core.MIN_ENTRIES} sales and expenses to see an illustrative cash-flow profile.`;
    document.getElementById("aside-copy").textContent = ready
      ? "Your records are building a clearer picture of your business."
      : entries
        ? `${core.MIN_ENTRIES - entries} more ${core.MIN_ENTRIES - entries === 1 ? "entry" : "entries"} and this picture becomes available.`
        : "Nothing recorded yet. Add a sale or expense to start building your picture.";
    document.getElementById("estimate-box").classList.toggle("hidden", !ready);
    document.querySelectorAll(".factor-live").forEach((row) => row.classList.toggle("hidden", !ready));
    document.getElementById("factor-empty").classList.toggle("hidden", ready);
    const disclaimer = document.querySelector(".factor-disclaimer");
    if (disclaimer) disclaimer.classList.toggle("hidden", !ready);
  }

  function transactionMarkup(item) {
    return `
      <div class="transaction-line">
        <span class="category-icon ${item.type === "income" ? "category-stock" : "category-transport"}">${icon(item.type === "income" ? "in" : "out")}</span>
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></div>
        <time>${escapeHtml(item.date)}</time>
        <strong class="amount ${item.type === "income" ? "positive-text" : ""}">${item.type === "income" ? "+" : "−"}${money(item.amount)}</strong>
      </div>`;
  }

  function renderTransactions() {
    const list = document.querySelector("#transaction-list");
    if (!list) return;
    if (!state.transactions.length) {
      list.innerHTML = `<p class="empty-note">Nothing recorded yet. Add a sale or expense in chat and it will appear here.</p>`;
      return;
    }
    list.innerHTML = state.transactions.slice(0, 6).map(transactionMarkup).join("");
  }

  function renderOfficerTransactions() {
    const list = document.querySelector("#officer-transaction-list");
    if (!list) return;
    if (!state.transactions.length) {
      list.innerHTML = `<p class="empty-note">No transactions have been recorded yet.</p>`;
      return;
    }
    list.innerHTML = state.transactions.slice(0, 5).map(transactionMarkup).join("");
  }

  function renderOfficerSummary(values) {
    const copy = document.getElementById("officer-copy");
    if (!copy) return;
    if (!state.transactions.length) {
      copy.textContent = "No entries have been recorded yet, so there is nothing to review.";
      return;
    }
    copy.textContent = values.profit >= 0
      ? "Recorded entries show more money in than out. Entries are self-reported and not verified, and no recommendation or lending decision is made here."
      : "Recorded expenses are higher than recorded income. Entries are self-reported and not verified, and no recommendation or lending decision is made here.";
  }

  return {
    totals,
    expenseCategories,
    refresh,
    renderTransactions,
    renderOfficerTransactions,
    renderOfficerSummary
  };
})();
