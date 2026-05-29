# SalesCloudInsights

A self-contained single-file web app that pulls live data from **SAP Sales Cloud V2** APIs, analyzes it with **Google Gemini AI**, and surfaces actionable business insights as color-coded notification cards — all in a sleek floating panel.

---

## Features

- 🔴🟠🟡 Color-coded insight cards (critical / warning / informational)
- 🤖 AI-powered analysis via Gemini 1.5 Flash
- 🌐 Full Hebrew (RTL) / English (LTR) localization
- ⚙️ Settings modal with `localStorage` persistence
- 🔄 Manual refresh button
- 📱 No build step — pure HTML + Vanilla JS

---

## Setup

1. Open `insights.html` in your browser (or visit the [live app](https://idanabra.github.io/SalesCloudInsights)).
2. Click ⚙️ to open **Settings** (opens automatically on first load).
3. Fill in:
   - **SAP Base URL** — e.g. `https://my-tenant.crm.cloud.sap`
   - **SAP Username** — your SAP Sales Cloud username
   - **SAP Password** — your SAP Sales Cloud password
   - **Gemini API Token** — get yours at [Google AI Studio](https://aistudio.google.com/app/apikey)
4. Choose your language (Hebrew / English).
5. Click **Save & Start** — insights will load automatically.

> Settings are saved in `localStorage` and persist across sessions.

---

## SAP Data Sources

The app fetches from these OData endpoints and filters client-side:

| Entity | Endpoint | Filter |
|---|---|---|
| Opportunities | `/sap/c4c/api/v1/opportunity-service/opportunities` | Open + CloseDate < today |
| Sales Quotes | `/sap/c4c/api/v1/sales-quote-service/salesQuotes` | Open |
| Leads | `/sap/c4c/api/v1/lead-service/leads` | Open |
| Tasks | `/sap/c4c/api/v1/task-service/tasks` | Open + DueDate < today |

---

## Screenshot

> _Add a screenshot here after first run_

![SalesCloudInsights Panel](screenshot.png)

---

## Tech Stack

- **Vanilla JS** — no frameworks, no build tools
- **Google Fonts** (Inter + Heebo) — the only external dependency
- **SAP Sales Cloud V2 OData API** — HTTP Basic Auth
- **Google Gemini 1.5 Flash** — REST API

---

## Live App

🌐 [https://idanabra.github.io/SalesCloudInsights](https://idanabra.github.io/SalesCloudInsights)
