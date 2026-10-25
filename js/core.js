/* Shared app state and formatting helpers. Every screen reads state from here. */
window.NF = window.NF || {};

NF.core = (() => {
  const MIN_ENTRIES = 5;
  const ILLUSTRATIVE_SCORE = 72;

  const state = {
    user: null,
    transactions: [],
    products: [],
    shared: false,
    withdrawn: false,
    toastTimer: null
  };

  function icon(name, className = "icon") {
    return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }

  function money(amount) {
    return `K${Math.round(amount).toLocaleString("en-ZM")}`;
  }

  function axisMoney(amount) {
    if (amount < 1000) return `K${Math.round(amount)}`;
    const thousands = amount / 1000;
    return `K${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  function loadUser(user) {
    state.user = user || null;
    const data = state.user ? NF.db.loadData(state.user.id) : NF.db.blankData();
    state.transactions = data.transactions;
    state.products = data.products;
    state.shared = false;
    state.withdrawn = false;
  }

  function persist() {
    if (!state.user) return;
    NF.db.saveData(state.user.id, {
      transactions: state.transactions,
      products: state.products
    });
  }

  return {
    MIN_ENTRIES,
    ILLUSTRATIVE_SCORE,
    state,
    icon,
    money,
    axisMoney,
    escapeHtml,
    showToast,
    initials,
    loadUser,
    persist
  };
})();
