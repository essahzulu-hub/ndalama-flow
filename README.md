# Ndalama Flow demo

A responsive, browser-only prototype of the Ndalama Flow SME cash-flow assistant. It follows the five screens in the concept and UI guide: chat, cash-flow dashboard, loan readiness, consent, and officer review.

## Run it

Open `index.html` in a modern browser. No build step, server, account, API key, or package installation is required.

## Try the demo

The app starts empty—no transactions and no score. Everything shown comes from what you type in chat.

- Add a transaction in chat, for example `Sold vegetables for K180` or `Paid K250 for transport`. The dashboard, category breakdown and weekly chart build from those entries.
- After five entries, **My loan chances** shows the illustrative readiness score and repayment estimate.
- Select the information to share, review the confirmation, and open **Officer view**.
- Withdraw demo access to turn off consent and lock the officer preview.

## Scope and safety

This is a front-end prototype that ships with no seeded data. It does not connect to Absa, a bank, a database, or an AI service. The applicant shown in the officer view is fictional. The readiness score and repayment estimate are static illustrations, revealed once five entries exist—not a credit score, eligibility assessment, loan offer, or lending decision. Chat entries are parsed locally in the browser and are not verified. Statement uploads, voice input, and Bemba/Nyanja translations are not implemented. Officer actions are demo-only.
