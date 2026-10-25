/* Storage layer: the app's only route to persistent data.
   Backed by localStorage, wrapped so the rest of the app never touches it
   directly. Swapping in a server database later means changing this file. */
window.NF = window.NF || {};

NF.db = (() => {
  const NAMESPACE = "ndalama.v2";
  const SCHEMA = 1;
  const memory = new Map();

  const keys = {
    schema: `${NAMESPACE}.schema`,
    users: `${NAMESPACE}.users`,
    session: `${NAMESPACE}.session`,
    data: (userId) => `${NAMESPACE}.data.${userId}`
  };

  let storage = null;
  try {
    const probe = `${NAMESPACE}.probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    storage = window.localStorage;
  } catch (error) {
    storage = null;
  }

  function readRaw(key) {
    if (!storage) return memory.has(key) ? memory.get(key) : null;
    try {
      return storage.getItem(key);
    } catch (error) {
      return memory.has(key) ? memory.get(key) : null;
    }
  }

  function writeRaw(key, value) {
    memory.set(key, value);
    if (!storage) return;
    try {
      storage.setItem(key, value);
    } catch (error) {
      /* Quota or a blocked storage context: the in-memory copy still holds. */
    }
  }

  function removeRaw(key) {
    memory.delete(key);
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch (error) {
      /* ignore */
    }
  }

  function read(key, fallback) {
    const raw = readRaw(key);
    if (raw === null || raw === undefined) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    writeRaw(key, JSON.stringify(value));
  }

  function init() {
    if (read(keys.schema, null) === SCHEMA) return;
    // First run of this schema: clear every earlier key so the app starts from zero.
    if (storage) {
      try {
        const stale = [];
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index);
          if (key && key.indexOf("ndalama.") === 0) stale.push(key);
        }
        stale.forEach((key) => storage.removeItem(key));
      } catch (error) {
        /* ignore */
      }
    }
    memory.clear();
    write(keys.schema, SCHEMA);
  }

  function users() {
    const list = read(keys.users, []);
    return Array.isArray(list) ? list.filter((user) => user && typeof user.id === "string") : [];
  }

  function saveUsers(list) {
    write(keys.users, list);
  }

  function session() {
    const value = read(keys.session, null);
    return value && typeof value.userId === "string" ? value : null;
  }

  function saveSession(value) {
    write(keys.session, value);
  }

  function clearSession() {
    removeRaw(keys.session);
  }

  function blankData() {
    return { transactions: [], products: [] };
  }

  function loadData(userId) {
    if (!userId) return blankData();
    const stored = read(keys.data(userId), null);
    const data = stored && typeof stored === "object" ? stored : {};
    return {
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      products: Array.isArray(data.products) ? data.products : []
    };
  }

  function saveData(userId, data) {
    if (!userId) return false;
    write(keys.data(userId), {
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      products: Array.isArray(data.products) ? data.products : []
    });
    return true;
  }

  function wipeAll() {
    memory.clear();
    if (!storage) return;
    try {
      const stale = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.indexOf("ndalama.") === 0) stale.push(key);
      }
      stale.forEach((key) => storage.removeItem(key));
    } catch (error) {
      /* ignore */
    }
    write(keys.schema, SCHEMA);
  }

  // Run once when the module loads so any caller is guaranteed a clean, current schema.
  init();

  return {
    NAMESPACE,
    SCHEMA,
    init,
    users,
    saveUsers,
    session,
    saveSession,
    clearSession,
    blankData,
    loadData,
    saveData,
    wipeAll
  };
})();
