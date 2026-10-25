/* Login page: tab switching, field validation feedback and the redirect in. */
(function () {
  const signInForm = document.querySelector("#form-signin");
  const signUpForm = document.querySelector("#form-signup");
  if (!signInForm || !signUpForm) return;

  const tabSignIn = document.querySelector("#tab-signin");
  const tabSignUp = document.querySelector("#tab-signup");
  const banner = document.querySelector("#auth-banner");
  const FIELDS = ["identifier", "username", "business", "phone", "pin", "confirm"];

  function setError(group, field, message) {
    const wrapper = document.querySelector(`#${group}-${field}-field`);
    const error = document.querySelector(`#${group}-${field}-error`);
    if (error) {
      error.textContent = message || "";
      error.classList.toggle("show", Boolean(message));
    }
    if (wrapper) wrapper.classList.toggle("has-error", Boolean(message));
  }

  function clearErrors(group) {
    FIELDS.forEach((field) => setError(group, field, ""));
    if (banner) {
      banner.textContent = "";
      banner.classList.remove("show");
    }
  }

  function showBanner(message) {
    if (!banner) return;
    banner.textContent = message;
    banner.classList.toggle("show", Boolean(message));
  }

  function showPanel(mode) {
    const signingIn = mode !== "signup";
    signInForm.classList.toggle("hidden", !signingIn);
    signUpForm.classList.toggle("hidden", signingIn);
    tabSignIn.classList.toggle("active", signingIn);
    tabSignUp.classList.toggle("active", !signingIn);
    tabSignIn.setAttribute("aria-selected", String(signingIn));
    tabSignUp.setAttribute("aria-selected", String(!signingIn));
    clearErrors("signin");
    clearErrors("signup");
    const target = signingIn ? document.querySelector("#signin-identifier") : document.querySelector("#signup-username");
    if (target) target.focus();
  }

  tabSignIn.addEventListener("click", () => showPanel("signin"));
  tabSignUp.addEventListener("click", () => showPanel("signup"));

  document.querySelectorAll("input.pin").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "").slice(0, 6);
    });
  });

  signInForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors("signin");
    const button = signInForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await NF.auth.signIn({
        identifier: document.querySelector("#signin-identifier").value,
        pin: document.querySelector("#signin-pin").value
      });
      if (!result.ok) {
        setError("signin", result.field, result.error);
        showBanner(result.error);
        return;
      }
      window.location.replace("index.html");
    } finally {
      button.disabled = false;
    }
  });

  signUpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors("signup");
    const button = signUpForm.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      const result = await NF.auth.signUp({
        username: document.querySelector("#signup-username").value,
        business: document.querySelector("#signup-business").value,
        phone: document.querySelector("#signup-phone").value,
        pin: document.querySelector("#signup-pin").value,
        confirmPin: document.querySelector("#signup-confirm").value
      });
      if (!result.ok) {
        setError("signup", result.field, result.error);
        showBanner(result.error);
        return;
      }
      window.location.replace("index.html");
    } finally {
      button.disabled = false;
    }
  });

  if (new URLSearchParams(window.location.search).get("mode") === "signup") showPanel("signup");
})();
