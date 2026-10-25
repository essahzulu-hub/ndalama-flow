/* Accounts: validation, PIN hashing, sign-up, sign-in and the session.
   PINs are salted and hashed before they ever reach storage. This is a
   browser-only prototype, so the hash is a deterrent, not real security. */
window.NF = window.NF || {};

NF.auth = (() => {
  const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
  const PIN_PATTERN = /^\d{6}$/;
  const NATIONAL_PATTERN = /^[79]\d{8}$/;

  function normalizePhone(value) {
    let digits = String(value || "").replace(/[^\d]/g, "");
    if (digits.indexOf("260") === 0 && digits.length > 9) digits = digits.slice(3);
    if (digits.indexOf("0") === 0 && digits.length > 9) digits = digits.slice(1);
    return digits;
  }

  function formatPhone(national) {
    const value = String(national || "");
    if (value.length !== 9) return value;
    return `+260 ${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`;
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function fallbackHash(input) {
    let first = 0x811c9dc5;
    let second = 0x01000193;
    for (let index = 0; index < input.length; index += 1) {
      const code = input.charCodeAt(index);
      first = Math.imul(first ^ code, 16777619) >>> 0;
      second = Math.imul(second + code, 2246822519) >>> 0;
    }
    return `fnv:${first.toString(16).padStart(8, "0")}${second.toString(16).padStart(8, "0")}`;
  }

  async function hashPin(pin, salt) {
    const input = `${salt}:${pin}`;
    try {
      if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
        const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
        return `sha256:${hex}`;
      }
    } catch (error) {
      /* fall through to the non-crypto hash */
    }
    return fallbackHash(input);
  }

  async function signUp({ username, business, phone, pin, confirmPin }) {
    const name = String(username || "").trim();
    if (!USERNAME_PATTERN.test(name)) {
      return { ok: false, field: "username", error: "Use 3–20 letters, numbers or underscores." };
    }
    const businessName = String(business || "").trim().replace(/\s+/g, " ");
    if (businessName.length < 2 || businessName.length > 60) {
      return { ok: false, field: "business", error: "Enter your business name (2–60 characters)." };
    }
    const national = normalizePhone(phone);
    if (!NATIONAL_PATTERN.test(national)) {
      return { ok: false, field: "phone", error: "Enter a Zambian mobile number, for example 097 123 4567." };
    }
    if (!PIN_PATTERN.test(String(pin || ""))) {
      return { ok: false, field: "pin", error: "Your PIN must be exactly 6 digits." };
    }
    if (String(pin) !== String(confirmPin || "")) {
      return { ok: false, field: "confirm", error: "The two PINs do not match." };
    }

    const users = NF.db.users();
    if (users.some((user) => user.usernameLower === name.toLowerCase())) {
      return { ok: false, field: "username", error: "That username is already taken." };
    }
    if (users.some((user) => user.phone === national)) {
      return { ok: false, field: "phone", error: "That phone number already has an account." };
    }

    const salt = randomSalt();
    const user = {
      id: `u_${Date.now().toString(36)}${Math.random().toString(16).slice(2, 6)}`,
      username: name,
      usernameLower: name.toLowerCase(),
      business: businessName,
      phone: national,
      pinSalt: salt,
      pinHash: await hashPin(pin, salt),
      createdAt: new Date().toISOString()
    };
    users.push(user);
    NF.db.saveUsers(users);
    NF.db.saveData(user.id, NF.db.blankData());
    NF.db.saveSession({ userId: user.id, startedAt: Date.now() });
    return { ok: true, user };
  }

  async function signIn({ identifier, pin }) {
    const raw = String(identifier || "").trim();
    if (!raw) return { ok: false, field: "identifier", error: "Enter your username or phone number." };
    if (!PIN_PATTERN.test(String(pin || ""))) {
      return { ok: false, field: "pin", error: "Your PIN must be exactly 6 digits." };
    }

    const national = normalizePhone(raw);
    const users = NF.db.users();
    const user = users.find((candidate) => candidate.usernameLower === raw.toLowerCase()
      || (national.length === 9 && candidate.phone === national));

    if (!user) return { ok: false, field: "identifier", error: "No account matches that username or phone number." };
    const hash = await hashPin(pin, user.pinSalt);
    if (hash !== user.pinHash) return { ok: false, field: "pin", error: "That PIN is not correct." };

    NF.db.saveSession({ userId: user.id, startedAt: Date.now() });
    return { ok: true, user };
  }

  function current() {
    const session = NF.db.session();
    if (!session) return null;
    return NF.db.users().find((user) => user.id === session.userId) || null;
  }

  function signOut() {
    NF.db.clearSession();
  }

  return {
    USERNAME_PATTERN,
    PIN_PATTERN,
    normalizePhone,
    formatPhone,
    hashPin,
    signUp,
    signIn,
    current,
    signOut
  };
})();
