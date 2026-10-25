/* Consent and the officer preview. Each toggle gates its block in the officer
   view; withdrawing locks the preview and disables the officer actions. */
window.NF = window.NF || {};

NF.consent = (() => {
  const core = NF.core;
  const state = core.state;
  const { icon } = core;

  let dialog = null;

  function applicantName() {
    return state.user ? state.user.username : "the applicant";
  }

  function update() {
    const banner = document.querySelector("#officer-banner");
    if (!banner) return;
    const consentChoices = [...document.querySelectorAll(".consent-toggle")].map((toggle) => toggle.checked);

    if (state.shared) {
      banner.innerHTML = `<span class="banner-icon">${icon("check")}</span><div><strong>Sample profile shared by ${core.escapeHtml(applicantName())}</strong><p>Consent confirmed on this device. No data was sent to Absa or any external service.</p></div><span class="status-pill">Consent active</span>`;
    } else {
      banner.innerHTML = `<span class="banner-icon">${icon(state.withdrawn ? "undo" : "info")}</span><div><strong>${state.withdrawn ? "Access withdrawn" : "Nothing has been shared yet"}</strong><p>${state.withdrawn ? "All consent toggles are off. The officer preview is locked." : "The applicant must choose and confirm what to share before it appears here."}</p></div><button class="button button-outline" data-screen="consent">Go to consent</button>`;
      banner.querySelector("[data-screen]")?.addEventListener("click", () => NF.app.navigate("consent"));
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

  function withdraw() {
    state.shared = false;
    state.withdrawn = true;
    document.querySelectorAll(".consent-toggle").forEach((toggle) => { toggle.checked = false; });
    update();
    core.showToast("Access withdrawn. No information is shared.");
  }

  function init() {
    dialog = document.querySelector("#share-dialog");
    const shareButton = document.querySelector("#share-button");
    if (!dialog || !shareButton) return;

    shareButton.addEventListener("click", () => {
      const selected = [...document.querySelectorAll(".consent-toggle:checked")].length;
      if (!selected) {
        core.showToast("Choose at least one item to include in your share.");
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
      update();
      core.showToast("Your sample profile is ready in the officer view.");
    });

    document.querySelectorAll(".consent-toggle").forEach((toggle) => {
      toggle.addEventListener("change", () => {
        if (state.shared) {
          state.shared = false;
          state.withdrawn = false;
          update();
          core.showToast("Your selection changed. Confirm again to share it.");
        }
      });
    });

    document.querySelector("#withdraw-consent").addEventListener("click", withdraw);
    document.querySelector("#withdraw-button").addEventListener("click", withdraw);

    document.querySelectorAll("[data-decision]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.decision;
        if (!state.shared) {
          core.showToast("The applicant has not shared this profile.");
          return;
        }
        const typedBy = state.user ? state.user.username : "officer";
        document.querySelector("#audit-entry").textContent = `${action} recorded for ${typedBy}`;
        core.showToast(`${action}. No lending decision was made.`);
      });
    });
  }

  return { init, update };
})();
