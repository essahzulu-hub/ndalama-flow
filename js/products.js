/* Products & services: the catalogue, its form, and recording a sale.
   Everything here is scoped to the signed-in account and saved through NF.core. */
window.NF = window.NF || {};

NF.products = (() => {
  const core = NF.core;
  const state = core.state;
  const { icon, money, escapeHtml } = core;
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

  let pendingImage = "";
  let formCard = null;
  let form = null;
  let nameField = null;
  let priceField = null;
  let typeField = null;
  let imageField = null;
  let preview = null;
  let previewImage = null;
  let previewName = null;

  function render() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;
    const units = state.products.reduce((sum, item) => sum + item.sold, 0);
    const revenue = state.products.reduce((sum, item) => sum + item.revenue, 0);
    document.getElementById("product-count").textContent = state.products.length;
    document.getElementById("product-units").textContent = units;
    document.getElementById("product-revenue").textContent = money(revenue);

    if (!state.products.length) {
      grid.innerHTML = `<p class="empty-note">No items yet. Add what you sell to start tracking sales.</p>`;
      return;
    }

    grid.innerHTML = state.products.map((item) => `
      <article class="product-card">
        <div class="product-thumb">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : icon(item.type === "Service" ? "briefcase" : "store")}</div>
        <div class="product-body">
          <span class="product-type">${escapeHtml(item.type)}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <div class="product-meta"><strong>${money(item.price)}</strong><span>${item.sold} sold · ${money(item.revenue)}</span></div>
        </div>
        <div class="product-actions">
          <button class="button button-primary product-sell" data-sell="${escapeHtml(item.id)}">${icon("check")} Mark sold</button>
          <button class="product-remove" data-remove="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)}">${icon("close")}</button>
        </div>
      </article>`).join("");
  }

  function add({ name, price, type, image }) {
    state.products.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name,
      price,
      type,
      image,
      sold: 0,
      revenue: 0
    });
    core.persist();
    render();
  }

  function recordSale(id) {
    const item = state.products.find((product) => product.id === id);
    if (!item) return;
    item.sold += 1;
    item.revenue += item.price;
    state.transactions.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "income",
      category: item.type,
      amount: item.price,
      name: item.name,
      detail: `Sale from your ${item.type === "Service" ? "services" : "products"} list`,
      date: "Today"
    });
    core.persist();
    render();
    NF.records.refresh();
    core.showToast(`${item.name} sold · ${money(item.price)} added to cash flow.`);
  }

  function remove(id) {
    const item = state.products.find((product) => product.id === id);
    if (!item) return;
    state.products = state.products.filter((product) => product.id !== id);
    core.persist();
    render();
    core.showToast(`${item.name} removed from your catalogue.`);
  }

  function resetForm() {
    if (!form) return;
    form.reset();
    pendingImage = "";
    preview.classList.add("hidden");
    previewImage.removeAttribute("src");
    previewName.textContent = "";
    formCard.classList.add("hidden");
  }

  function init() {
    formCard = document.querySelector("#product-form-card");
    form = document.querySelector("#product-form");
    nameField = document.querySelector("#product-name");
    priceField = document.querySelector("#product-price");
    typeField = document.querySelector("#product-type");
    imageField = document.querySelector("#product-image");
    preview = document.querySelector("#product-preview");
    previewImage = document.querySelector("#product-preview-image");
    previewName = document.querySelector("#product-preview-name");
    if (!form || !formCard) return;

    document.querySelector("#add-product-button").addEventListener("click", () => {
      formCard.classList.remove("hidden");
      nameField.focus();
    });
    document.querySelector("#cancel-product").addEventListener("click", resetForm);

    imageField.addEventListener("change", () => {
      const file = imageField.files && imageField.files[0];
      pendingImage = "";
      preview.classList.add("hidden");
      if (!file) return;
      if (file.size > MAX_IMAGE_BYTES) {
        imageField.value = "";
        core.showToast("Choose an image smaller than 2 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        pendingImage = typeof reader.result === "string" ? reader.result : "";
        if (!pendingImage) return;
        previewImage.src = pendingImage;
        previewName.textContent = file.name;
        preview.classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = nameField.value.trim().slice(0, 60);
      const price = Number(priceField.value);
      if (!name || !Number.isFinite(price) || price <= 0) {
        core.showToast("Add a name and a price above zero.");
        return;
      }
      add({
        name,
        price,
        type: typeField.value === "Service" ? "Service" : "Product",
        image: pendingImage
      });
      resetForm();
      core.showToast(`${name} added to your catalogue.`);
    });

    document.querySelector("#product-grid").addEventListener("click", (event) => {
      const sellButton = event.target.closest("[data-sell]");
      if (sellButton) {
        recordSale(sellButton.dataset.sell);
        return;
      }
      const removeButton = event.target.closest("[data-remove]");
      if (removeButton) remove(removeButton.dataset.remove);
    });
  }

  return { render, init };
})();
