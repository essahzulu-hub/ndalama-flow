# Ndalama Flow

A responsive, browser-only prototype of the Ndalama Flow SME cash-flow assistant. It has accounts, a product catalogue, a cash-flow dashboard, loan readiness, a consent screen and an officer review.

## Run it

Open `index.html` in a modern browser. If nobody is signed in you land on `login.html` instead, and the app stays hidden until you create an account or sign in. No build step, server or package installation is required.

## File structure

```
index.html            the app shell (requires a session)
login.html            sign in / create account (reachable only when signed out)
styles/
  app.css             the app UI
  auth.css            the login page
js/
  db.js               storage layer: accounts, sessions, per-account data, schema reset
  auth.js             validation, salted PIN hashing, sign up / sign in / sign out
  guard.js            session gate, runs in <head> so nothing paints first
  login.js            login page behaviour
  core.js             shared state, formatting and toast helpers
  records.js          totals, dashboard, readiness, activity, officer summary
  products.js         catalogue and marking an item sold
  chat.js             the local chat parser, replies and undo
  consent.js          consent toggles and the officer preview
  app.js              navigation, signed-in identity, boot order
```

## Accounts and data

Creating an account needs a business name (2–60 characters), a username (3–20 letters, numbers or underscores), a Zambian mobile number and a 6-digit PIN entered twice. You then sign in with either the username or the phone number plus the PIN. The business name shows in the sidebar and, with the phone number, on the officer review.

Everything is stored in this browser's `localStorage` under `ndalama.v2.*`:

- `users` – accounts (username, business name, phone, created date), each with a random salt and a SHA-256 hash of the PIN (a non-crypto hash is used if the browser has no WebCrypto). The PIN itself is never stored.
- `session` – which account is signed in on this device.
- `data.<account id>` – that account's transactions and product catalogue, kept separate per account.

Two honest limits: this is per-device storage, not a server, and a client-side hash deters casual inspection rather than providing real security. On first load of this version the storage layer clears every earlier `ndalama.*` key, so old demo data starts from zero.

## Try it

- Create an account, then record a transaction in chat, for example `Sold vegetables for K180` or `Paid K250 for transport`. The dashboard, category breakdown and weekly chart build from those entries.
- Add an item on **Products & services** with a name, price and optional photo, then hit **Mark sold** to record that sale in your cash flow.
- After five entries, **Loan chances** shows the illustrative readiness score and repayment estimate.
- Select the information to share, review the confirmation, and open **Officer view**. Withdraw access to turn consent off and lock the officer preview.
- Sign out from the button in the sidebar profile.

## Scope and safety

This is a front-end prototype that ships with no seeded data. It does not connect to Absa, a bank, a database server, or an AI service. The applicant shown in the officer view is the signed-in account. The readiness score and repayment estimate are static illustrations, revealed once five entries exist—not a credit score, eligibility assessment, loan offer, or lending decision. Chat entries are parsed locally in the browser and are not verified. Statement uploads, voice input, and Bemba/Nyanja translations are not implemented. Officer actions are illustrative only.
