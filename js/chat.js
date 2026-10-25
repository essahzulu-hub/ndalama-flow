/* Chat: the local parser, assistant replies, and undo.
   Each recorded entry is written to the signed-in account's records. */
window.NF = window.NF || {};

NF.chat = (() => {
  const core = NF.core;
  const state = core.state;
  const { icon, money, escapeHtml } = core;

  let thread = null;
  let input = null;

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
    return {
      id,
      type,
      category,
      amount,
      label,
      name: `${category} ${type === "income" ? "sales" : "expense"}`,
      detail: type === "income" ? "Sale recorded in chat" : "Expense recorded in chat",
      date: "Today"
    };
  }

  function respond(message) {
    const lowered = message.toLowerCase();
    if (/loan|chances|afford|borrow/.test(lowered)) {
      const entries = state.transactions.length;
      if (entries < core.MIN_ENTRIES) {
        appendMessage(`You have ${entries} of ${core.MIN_ENTRIES} entries needed for an illustrative profile. Keep recording sales and expenses — nothing here is a real credit score or lending decision.`, "assistant");
      } else {
        appendMessage(`Your profile is still building. Its ${core.ILLUSTRATIVE_SCORE}/100 score and example K1,300 monthly repayment are illustrative only—not a real credit score, loan offer, or approval. An Absa loan officer would make any real decision.`, "assistant");
      }
      NF.app.navigate("readiness");
      return;
    }
    if (/tip|improve|record|help/.test(lowered) && !/\d/.test(lowered)) {
      appendMessage("Keep recording sales and expenses regularly, and check that each entry is right. This assistant uses self-reported data, so it cannot verify transactions or predict a real loan decision.", "assistant");
      return;
    }
    const transaction = classify(message);
    if (!transaction) {
      appendMessage("I couldn’t find an amount in that message. Try something like “Sold vegetables for K180” or “Paid K250 for transport.”", "assistant");
      return;
    }
    state.transactions.unshift(transaction);
    core.persist();
    appendMessage(`Got it! I’ve recorded that ${transaction.type === "income" ? "sale" : "expense"} for you. Please check that the details are right.`, "assistant", transaction);
    NF.records.refresh();
  }

  function init() {
    thread = document.querySelector("#chat-thread");
    input = document.querySelector("#message-input");
    const form = document.querySelector("#message-form");
    if (!thread || !input || !form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;
      appendMessage(message, "user");
      input.value = "";
      window.setTimeout(() => respond(message), 250);
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
          form.requestSubmit();
        }
      });
    });

    thread.addEventListener("click", (event) => {
      const undoButton = event.target.closest("[data-undo]");
      if (!undoButton) return;
      const transactionId = undoButton.dataset.undo;
      if (!transactionId || !state.transactions.some((item) => item.id === transactionId)) return;
      state.transactions = state.transactions.filter((item) => item.id !== transactionId);
      core.persist();
      undoButton.closest(".message-row")?.remove();
      NF.records.refresh();
      core.showToast("Your last entry was removed.");
    });
  }

  return { init, appendMessage };
})();
