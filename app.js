(() => {
  const MIN_ENTRIES = 5;
  const DEMO_SCORE = 72;
  const state = {
    transactions: [],
    shared: false,
    withdrawn: false,
    toastTimer: null
  };
  const screens = {
    chat: "Overview",
    dashboard: "Cash flow",
    readiness: "Loan readiness",
    consent: "Share with Absa",
    officer: "Officer view"
  };
  const thread = document.querySelector("#chat-thread");
  const input = document.querySelector("#message-input");
  const toast = document.querySelector("#toast");
  const dialog = document.querySelector("#share-dialog");

  const icon = (name, className = "icon") => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function navigate(screen) {
    if (!screens[screen]) return;
    document.querySelectorAll(".screen").forEach((element) => {
      element.classList.toggle("hidden", element.id !== `screen-${screen}`);
    });
    document.querySelectorAll(".nav-item").forEach((element) => {
      element.classList.toggle("active", element.dataset.screen === screen);
    });
    document.querySelector("#current-page").textContent = screens[screen];
    if (screen === "officer") updateOfficerView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function money(amount) {
    return `K${Math.round(amount).toLocaleString("en-ZM")}`;
  }

  function axisMoney(amount) {
    if (amount < 1000) return `K${Math.round(amount)}`;
    const thousands = amount / 1000;
    return `K${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }

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

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function refresh() {
    const values = totals();
    [[ "mini-income", values.income ], [ "dash-income", values.income ], [ "officer-income", values.income ],
      [ "mini-expenses", values.expenses ], [ "dash-expenses", values.expenses ], [ "officer-expenses", values.expenses ],
      [ "mini-profit", values.profit ], [ "dash-profit", values.profit ], [ "officer-profit", values.profit ]]
      .forEach(([id, amount]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = money(amount);
      });
    renderDashboard(values);
    renderReadiness(values);
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

  function renderReadiness(values) {
    const entries = state.transactions.length;
    const ready = entries >= MIN_ENTRIES;
    const percent = ready ? DEMO_SCORE : 0;
    const ring = ready ? `conic-gradient(var(--green) 0 ${percent}%, #eaf1ed ${percent}% 100%)` : "conic-gradient(#dfe7e2 0 100%)";
    ["ready-ring", "aside-ring"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.style.background = ring;
    });
    document.getElementById("ready-score").textContent = ready ? DEMO_SCORE : "--";
    document.getElementById("aside-score").textContent = ready ? DEMO_SCORE : "--";
    document.getElementById("ready-progress").style.width = `${percent}%`;
    document.getElementById("aside-progress").style.width = `${percent}%`;
    document.getElementById("ready-status").textContent = ready ? "Almost ready" : "Not enough records";
    document.getElementById("aside-status").textContent = ready ? "Almost ready" : "Not enough records";
    document.getElementById("ready-title").textContent = ready ? "A promising start" : "Just getting started";
    document.getElementById("ready-copy").textContent = ready
      ? "Your recorded entries show money coming in. A longer record can make this picture more useful."
      : `Nothing recorded yet. Add at least ${MIN_ENTRIES} sales and expenses to see an illustrative cash-flow profile.`;
    document.getElementById("aside-copy").textContent = ready
      ? "Your records are building a clearer picture of your business."
      : entries
        ? `${MIN_ENTRIES - entries} more ${MIN_ENTRIES - entries === 1 ? "entry" : "entries"} and this picture becomes available.`
        : "Nothing recorded yet. Add a sale or expense to start building your picture.";
    document.getElementById("estimate-box").classList.toggle("hidden", !ready);
    document.querySelectorAll(".factor-live").forEach((row) => row.classList.toggle("hidden", !ready));
    document.getElementById("factor-empty").classList.toggle("hidden", ready);
    const disclaimer = document.querySelector(".factor-disclaimer");
    if (disclaimer) disclaimer.classList.toggle("hidden", !ready);
  }

  function renderTransactions() {
    const list = document.querySelector("#transaction-list");
    if (!list) return;
    if (!state.transactions.length) {
      list.innerHTML = `<p class="empty-note">Nothing recorded yet. Add a sale or expense in chat and it will appear here.</p>`;
      return;
    }
    list.innerHTML = state.transactions.slice(0, 6).map((item) => `
      <div class="transaction-line">
        <span class="category-icon ${item.type === "income" ? "category-stock" : "category-transport"}">${icon(item.type === "income" ? "in" : "out")}</span>
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></div>
        <time>${escapeHtml(item.date)}</time>
        <strong class="amount ${item.type === "income" ? "positive-text" : ""}">${item.type === "income" ? "+" : "−"}${money(item.amount)}</strong>
      </div>`).join("");
  }

  function renderOfficerTransactions() {
    const list = document.querySelector("#officer-transaction-list");
    if (!list) return;
    if (!state.transactions.length) {
      list.innerHTML = `<p class="empty-note">No transactions have been recorded yet.</p>`;
      return;
    }
    list.innerHTML = state.transactions.slice(0, 5).map((item) => `
      <div class="transaction-line">
        <span class="category-icon ${item.type === "income" ? "category-stock" : "category-transport"}">${icon(item.type === "income" ? "in" : "out")}</span>
        <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.detail)}</small></div>
        <time>${escapeHtml(item.date)}</time>
        <strong class="amount ${item.type === "income" ? "positive-text" : ""}">${item.type === "income" ? "+" : "−"}${money(item.amount)}</strong>
      </div>`).join("");
  }

  function renderOfficerSummary(values) {
    const copy = document.getElementById("officer-copy");
    if (!copy) return;
    if (!state.transactions.length) {
      copy.textContent = "No entries have been recorded yet, so there is nothing to review.";
      return;
    }
    copy.textContent = values.profit >= 0
      ? "Recorded entries show more money in than out. Entries are self-reported and not verified, and this demo makes no recommendation or lending decision."
      : "Recorded expenses are higher than recorded income. Entries are self-reported and not verified, and this demo makes no recommendation or lending decision.";
  }

  function appendMessage(text, role, card) {
    const row = document.createElement("div");
    row.className = `message-row ${role === "user" ? "user-row" : "assistant-row"}`;
    if (role === "assistant") {
      const avatar = document.createElement("div");
      avatar.className = "assistant-avatar small";
      avatar.innerHTML = `n<span>${icon("spark")}</span>`;
      row.append(avatar);
    }
    const content = document.createElement("div");
    content.className = "message-content";
    const bubble = document.createElement("div");
    bubble.className = `bubble ${role === "user" ? "user-bubble" : "assistant-bubble"}`;
    bubble.textContent = text;
    content.append(bubble);
    if (card) {
      const cardElement = document.createElement("div");
      cardElement.className = "transaction-card";
      cardElement.dataset.transactionId = card.id;
      cardElement.innerHTML = `<div class="transaction-icon">${icon(card.type === "income" ? "in" : "out")}</div><div><strong>${escapeHtml(card.label)} · ${escapeHtml(card.category)}</strong><span>Today · ${card.type === "income" ? "Income" : "Expense"}</span></div><strong class="transaction-amount">${card.type === "income" ? "+" : "−"}${money(card.amount)}</strong><button class="undo-link" data-undo="${escapeHtml(card.id)}">Undo</button>`;
      content.append(cardElement);
    }
    const time = document.createElement("span");
    time.className = "message-time";
    time.textContent = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
    content.append(time);
    row.append(content);
    thread.append(row);
    thread.scrollTop = thread.scrollHeight;
  }

  function classify(message) {
    const lowered = message.toLowerCase();
    const amountMatches = [...message.matchAll(/(?:k\s*)?([\d,]+(?:\.\d{1,2})?)/gi)];
    const amount = amountMatches.length ? Number(amountMatches[amountMatches.length - 1][1].replaceAll(",", "")) : NaN;
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) return null;
    const isExpense = /\b(paid|bought|spent|cost|expense|transport|rent|purchase|for)\b/i.test(lowered)
      && !/\b(sold|sale|earned|received|income)\b/i.test(lowered);
    const type = isExpense ? "expense" : "income";
    const category = /\b(charcoal|bag|bags)\b/i.test(lowered) ? "Charcoal"
      : /\b(vegetable|vegetables|tomato|tomatoes)\b/i.test(lowered) ? "Vegetables"
        : /\b(transport|taxi|bus|fuel)\b/i.test(lowered) ? "Transport"
          : /\b(rent)\b/i.test(lowered) ? "Rent"
            : /\b(grocery|groceries|stock|supplies|bought)\b/i.test(lowered) ? "Stock & supplies"
              : "General";
    const label = type === "income" ? "Sale" : "Expense";
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return { id, type, category, amount, label, name: `${category} ${type === "income" ? "sales" : "expense"}`, detail: type === "income" ? "Sale recorded in chat" : "Expense recorded in chat", date: "Today" };
  }

  function respondToMessage(message) {
    const lowered = message.toLowerCase();
    if (/loan|chances|afford|borrow/.test(lowered)) {
      const entries = state.transactions.length;
      if (entries < MIN_ENTRIES) {
        appendMessage(`You have ${entries} of ${MIN_ENTRIES} entries needed for an illustrative profile. Keep recording sales and expenses — nothing here is a real credit score or lending decision.`, "assistant");
      } else {
        appendMessage(`Your demo profile is still building. Its ${DEMO_SCORE}/100 score and example K1,300 monthly repayment are illustrative only—not a real credit score, loan offer, or approval. An Absa loan officer would make any real decision.`, "assistant");
      }
      navigate("readiness");
      return;
    }
    if (/tip|improve|record|help/.test(lowered) && !/\d/.test(lowered)) {
      appendMessage("Keep recording sales and expenses regularly, and check that each entry is right. This demo uses self-reported data, so it cannot verify transactions or predict a real loan decision.", "assistant");
      return;
    }
    const transaction = classify(message);
    if (!transaction) {
      appendMessage("I couldn’t find an amount in that message. Try something like “Sold vegetables for K180” or “Paid K250 for transport.”", "assistant");
      return;
    }
    state.transactions.unshift(transaction);
    appendMessage(`Got it! I’ve recorded that ${transaction.type === "income" ? "sale" : "expense"} for you. Please check that the details are right.`, "assistant", transaction);
    refresh();
  }

  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.screen));
  });
  document.querySelector("#message-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    appendMessage(message, "user");
    input.value = "";
    window.setTimeout(() => respondToMessage(message), 250);
  });
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      const prompt = button.dataset.prompt;
      if (prompt === "Add a sale") {
        input.value = "";
        input.placeholder = "For example: Sold vegetables for K180";
        input.focus();
      } else if (prompt === "Add an expense") {
        input.value = "";
        input.placeholder = "For example: Paid K250 for transport";
        input.focus();
      } else {
        input.value = prompt;
        document.querySelector("#message-form").requestSubmit();
      }
    });
  });
  thread.addEventListener("click", (event) => {
    const undoButton = event.target.closest("[data-undo]");
    if (!undoButton) return;
    const transactionId = undoButton.dataset.undo;
    if (!transactionId || !state.transactions.some((item) => item.id === transactionId)) return;
    state.transactions = state.transactions.filter((item) => item.id !== transactionId);
    undoButton.closest(".message-row")?.remove();
    refresh();
    showToast("Your last demo entry was removed.");
  });

  document.querySelector("#share-button").addEventListener("click", () => {
    const selected = [...document.querySelectorAll(".consent-toggle:checked")].length;
    if (!selected) {
      showToast("Choose at least one item to include in your demo share.");
      return;
    }
    document.querySelector("#share-dialog-copy").textContent = `${selected} selected item${selected === 1 ? "" : "s"} will appear in the officer preview on this device only. Nothing will be sent to Absa.`;
    dialog.showModal();
  });
  document.querySelector("#confirm-share").addEventListener("click", (event) => {
    event.preventDefault();
    state.shared = true;
    state.withdrawn = false;
    dialog.close();
    updateOfficerView();
    showToast("Your sample profile is ready in the demo officer view.");
  });
  document.querySelectorAll(".consent-toggle").forEach((toggle) => {
    toggle.addEventListener("change", () => {
      if (state.shared) {
        state.shared = false;
        state.withdrawn = false;
        updateOfficerView();
        showToast("Your selection changed. Confirm again to share it.");
      }
    });
  });
  const withdraw = () => {
    state.shared = false;
    state.withdrawn = true;
    document.querySelectorAll(".consent-toggle").forEach((toggle) => { toggle.checked = false; });
    updateOfficerView();
    showToast("Demo access withdrawn. No information is shared.");
  };
  document.querySelector("#withdraw-consent").addEventListener("click", withdraw);
  document.querySelector("#withdraw-button").addEventListener("click", withdraw);
  document.querySelectorAll("[data-decision]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.decision;
      if (!state.shared) {
        showToast("The applicant has not shared this demo profile.");
        return;
      }
      document.querySelector("#audit-entry").textContent = `${action} recorded in demo by officer`;
      showToast(`${action}. Demo action only; no lending decision was made.`);
    });
  });
  document.querySelector("#language").addEventListener("change", (event) => {
    if (event.target.value !== "en") {
      showToast("English demo content shown. Bemba and Nyanja translations are not yet available.");
      event.target.value = "en";
    }
  });
  document.querySelector(".attach-button").addEventListener("click", () => showToast("Statement upload is not connected in this demo."));
  document.querySelector(".mic-button").addEventListener("click", () => showToast("Voice input is not available in this demo."));

  function updateOfficerView() {
    const banner = document.querySelector("#officer-banner");
    const consentChoices = [...document.querySelectorAll(".consent-toggle")].map((toggle) => toggle.checked);
    if (state.shared) {
      banner.innerHTML = `<span class="banner-icon">${icon("check")}</span><div><strong>Sample profile shared by Kalaba M.</strong><p>Consent confirmed in this local demo. No data was sent to Absa or any external service.</p></div><span class="status-pill">Demo consent active</span>`;
    } else {
      banner.innerHTML = `<span class="banner-icon">${icon(state.withdrawn ? "undo" : "info")}</span><div><strong>${state.withdrawn ? "Demo access withdrawn" : "Nothing has been shared yet"}</strong><p>${state.withdrawn ? "All demo consent toggles are off. The officer preview is locked." : "The applicant must choose and confirm what to share before it appears here."}</p></div><button class="button button-outline" data-screen="consent">Go to consent</button>`;
      banner.querySelector("[data-screen]")?.addEventListener("click", () => navigate("consent"));
    }
    document.querySelectorAll(".officer-grid").forEach((element) => {
      element.style.display = state.shared ? "" : "none";
      element.setAttribute("aria-disabled", String(!state.shared));
    });
    document.querySelector("#officer-cashflow").hidden = !consentChoices[0];
    document.querySelector("#officer-chart").hidden = !consentChoices[0];
    document.querySelector("#officer-transactions").classList.toggle("hidden", !consentChoices[1]);
    document.querySelector("#officer-profile").hidden = !consentChoices[2] && !consentChoices[3];
    document.querySelector("#officer-profile .section-header").hidden = !consentChoices[2];
    document.querySelector("#officer-profile .recommendation-copy").hidden = !consentChoices[2];
    document.querySelector("#officer-quality").hidden = !consentChoices[3];
    document.querySelectorAll(".decision-actions button").forEach((button) => {
      button.disabled = !state.shared;
      button.style.cursor = state.shared ? "pointer" : "not-allowed";
    });
    const withdrawButton = document.querySelector("#withdraw-button");
    withdrawButton.disabled = !state.shared;
    withdrawButton.style.opacity = state.shared ? "1" : ".5";
    withdrawButton.style.cursor = state.shared ? "pointer" : "not-allowed";
    document.querySelector("#withdraw-consent").classList.toggle("hidden", !state.shared);
  }

  refresh();
  updateOfficerView();
})();
