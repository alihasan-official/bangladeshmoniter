# DeltaSentry: Bangladesh Intelligence, Disaster & Weather Command Center

DeltaSentry is an advanced, production-grade, open-source Bangladesh-focused Intelligence, Weather, Disaster, and Situational Awareness Command Center. Built entirely as a 100% client-side Single Page Application (SPA), it provides high-density situational awareness with zero backend server dependencies or costs, making it perfectly optimized for static hosting platforms like GitHub Pages.

This platform is adapted and substantially extended from the open-source situational awareness framework of `koala73/worldmonitor`, honoring all copyright notices, licenses (AGPL-3.0), and attribution guidelines.

---

## 🚀 Core Features

### 🗺️ Advanced Mapping & Geospatial Analytics
- **Dynamic Spatial Viewport:** Clamped to South Asia bounds `[[68.0, 5.0], [100.0, 36.0]]` with a default focus centered on Bangladesh (`Lat 23.6850, Lng 90.3563`).
- **Interactive Layer Switcher:** Toggleable registries for OSINT incidents, critical infrastructure, sea lane shipping channels, transboundary river flows, animated weather radar sweeps, and live aviation tracking.
- **Theme Adapters:** Smooth swappable Day Mode (CartoDB Positron) and Night Mode (CartoDB Dark Matter) maps that dynamically adapt contrast and layer styling for high readability.
- **Marker Clustering & Heatmaps:** High-performance canvas rendering and spatial aggregation powered by `@turf/turf` and `supercluster` targeting 60 FPS.

### 📰 Bangladesh News Intelligence
- **CORS-Bypassing RSS News Wire:** Native client-side parsing of Google News feeds using the Allorigins proxy to retrieve news relating to disasters, infrastructure, shipping, military, politics, and environment.
- **Client-Side Location Extraction:** Automatic regex-based geotagging of headlines matching a highly precise dictionary of 64+ Bangladesh districts (with compound names matched first to prevent coordinate overlapping).
- **Bangla translation:** On-the-fly translation / cleansing of common Bangla disaster terms (e.g., "ঘূর্ণিঝড়" translated to "Cyclone").

### 🌦️ Meteorological & Environmental Monitoring
- **Live Weather Telemetry:** Real-time readings fetched from Open-Meteo for wind speed, temperature, and environmental stress.
- **Situational Risk Indexing:** Composite risk dial calculation for Environmental Risk, Infrastructure Status, and Public Incident Risk compiled from meteorological parameters, earthquake alerts, and news keywords.
- **Animated Radars:** Visual animated scatter layers simulating active Doppler weather radars.

### ✈️ Live Streams & Telemetry Polling
- **Aviation & Maritime tracking:** Real-time flight states within Bangladesh airspace queried via OpenSky network (180s interval) with offline `localStorage` fallback caches (`bd_flights_cache`) and HTTP 429 rate-limit alerts.
- **DSEX stock index:** Continuous tracking of the Dhaka Stock Exchange Index parsed from Yahoo Finance (300s interval) with historical sparkline visualization.

### 🧠 Client-Side AI Regional Analyst
- **BYOK AI Handshake:** Direct browser-to-provider handshake with Groq Cloud, OpenAI, or OpenRouter. Keys are strictly stored in local transient browser memory slices.
- **Internal NLP Fallback:** Native rule-based spatial intelligence model that executes immediately if API keys are absent or if the user is offline.

---

## 🛠️ Tech Stack & Requirements

- **Framework:** React 18 (TypeScript)
- **State Management:** Zustand
- **Database:** Dexie (IndexedDB management with safe `bulkPut` seeding)
- **Map System:** MapLibre GL JS & Deck.gl (`@deck.gl/react`)
- **Styling:** Tailwind CSS (Pure CSS animated keyframes for sweeps, pulse rings, and marquee)
- **Icons:** Lucide React
- **Build System:** Vite

---

## 📁 Architecture Directory Guide

- `src/App.tsx`: Main command center HUD dashboard.
- `src/index.css`: Tailwind directives, custom scrollbars, animations, and high-contrast light/dark mode adapters.
- `src/components/map/MapCanvas.tsx`: MapLibre base canvas layered with Deck.gl WebGL vector layers (Line, Scatter, Radar).
- `src/services/db.ts`: Structured IndexedDB tables schema definition.
- `src/services/dataSeeder.ts`: Initial seeder utilizing safe `.bulkPut()` to load tactical assets and mock indices.
- `src/services/rssAggregator.ts`: Google News aggregator, Bangla-to-English translation helper, and district coordinate dictionary matching rules.
- `src/services/dashboardPoll.ts`: Multi-threaded asynchronous polling controllers for OpenSky aviation, Yahoo Finance DSEX, and Open-Meteo variables.
- `src/store/useStore.ts`: Central state machine storing view states, layers, live feeds, risk breakdowns, and keys.
- `src/utils/export.ts`: Structured exporters supporting GeoJSON maps, CSV logs, and Executive Markdown reports.
- `src/utils/spatial.ts`: Proximity calculation engines and Supercluster wrapper classes.

---

## ⚙️ Execution & Deployment Guide

### Local Development
To run the server locally on your machine:
```bash
npm install
npm run dev
```

### Production Build
To compile the static production-ready SPA bundle optimized for hosting under the `/docs` directory (native GitHub Pages format):
```bash
npm run build
```

---

## 📄 License & Attribution

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
- All upstream obligations, licenses, and copyright notices of `koala73/worldmonitor` have been fully preserved.
- Substantial original enhancements, including localized news parser routines, polling engines, and the bottom horizontal console paradigm, are contributed back to the open-source community.
