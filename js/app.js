/* App shell: navigation, the signed-in identity, sign out, and the boot order. */
window.NF = window.NF || {};

NF.app = (() => {
  const core = NF.core;
  const state = core.state;

  const screens = {
    chat: "Overview",
    products: "Products & services",
    dashboard: "Cash flow",
    readiness: "Loan readiness",
    consent: "Share with Absa",
    officer: "Officer view"
  };

  function navigate(screen) {
    if (!screens[screen]) return;
    document.querySelectorAll(".screen").forEach((element) => {
      element.classList.toggle("hidden", element.id !== `screen-${screen}`);
    });
    document.querySelectorAll(".nav-item").forEach((element) => {
      element.classList.toggle("active", element.dataset.screen === screen);
    });
    const crumb = document.querySelector("#current-page");
    if (crumb) crumb.textContent = screens[screen];
    if (screen === "officer") NF.consent.update();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function paintIdentity() {
    const user = state.user;
    if (!user) return;
    const name = user.username;
    const phone = NF.auth.formatPhone(user.phone);
    const business = String(user.business || "").trim() || "Your business";
    const initials = core.initials(business);

    document.querySelectorAll(".profile strong").forEach((element) => { element.textContent = name; });
    document.querySelectorAll(".profile small").forEach((element) => { element.textContent = business; });
    const profile = document.querySelector(".profile");
    if (profile) profile.title = phone;
    document.querySelectorAll(".profile .avatar").forEach((element) => { element.textContent = initials; });

    const greeting = document.getElementById("greeting-name");
    if (greeting) greeting.textContent = name;

    const chatGreeting = document.querySelector("[data-greeting]");
    if (chatGreeting) {
      const count = state.transactions.length;
      const tail = count
        ? `You already have ${count} ${count === 1 ? "entry" : "entries"} saved.`
        : "Nothing has been recorded yet, so this is a clean start.";
      chatGreeting.textContent = `Good morning, ${name}! How is ${business} doing today? Tell me about a sale or expense and I’ll add it to your records. ${tail}`;
    }

    const applicant = document.getElementById("officer-applicant-name");
    if (applicant) applicant.textContent = name;
    const applicantAvatar = document.getElementById("officer-applicant-avatar");
    if (applicantAvatar) applicantAvatar.textContent = initials;
    const applicantBusiness = document.getElementById("officer-applicant-business");
    if (applicantBusiness) applicantBusiness.textContent = `${business} · ${phone}`;
  }

  function signOut() {
    NF.auth.signOut();
    window.location.replace("login.html");
  }

  function wire() {
    document.querySelectorAll("[data-screen]").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.screen));
    });

    const signOutButton = document.querySelector("#signout");
    if (signOutButton) signOutButton.addEventListener("click", signOut);

    const language = document.querySelector("#language");
    if (language) {
      language.addEventListener("change", (event) => {
        if (event.target.value !== "en") {
          core.showToast("English content shown. Bemba and Nyanja translations are not yet available.");
          event.target.value = "en";
        }
      });
    }

    document.querySelector(".attach-button")?.addEventListener("click", () => core.showToast("Statement upload is not connected yet."));
    document.querySelector(".mic-button")?.addEventListener("click", () => core.showToast("Voice input is not available yet."));
  }

  function boot() {
    const user = NF.auth.current();
    if (!user) {
      window.location.replace("login.html");
      return;
    }
    core.loadUser(user);
    NF.products.init();
    NF.chat.init();
    NF.consent.init();
    wire();
    paintIdentity();
    NF.products.render();
    NF.records.refresh();
    NF.consent.update();
    document.documentElement.classList.remove("locked");
  }

  return { navigate, boot, signOut, paintIdentity };
})();

NF.app.boot();
