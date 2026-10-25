/* Runs synchronously in <head> so nothing paints before the session is checked.
   <html data-auth="app"> is redirected to the login page without a session;
   <html data-auth="guest"> is redirected to the app when already signed in. */
(function () {
  const root = document.documentElement;
  const mode = root.dataset.auth;

  try {
    NF.db.init();
  } catch (error) {
    /* storage unavailable: fall through, the app works in memory */
  }

  let user = null;
  try {
    user = NF.auth.current();
  } catch (error) {
    user = null;
  }

  if (mode === "app" && !user) {
    window.location.replace("login.html");
    return;
  }
  if (mode === "guest" && user) {
    window.location.replace("index.html");
    return;
  }

  /* The app page unlocks in NF.app.boot() once the account's name is painted,
     so nothing stale or half-built is ever visible. The login page can paint now. */
  if (mode !== "app") root.classList.remove("locked");
})();
