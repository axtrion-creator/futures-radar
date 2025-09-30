# Offline Notion Futures Radar

An offline-first, semi-circular futures radar that visualises Notion exports (JSON or CSV) in the browser. Built with Vite, React, TypeScript, D3, and Zustand.

## Getting Started

1. Install dependencies (requires Node.js 20+):

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

   The app loads `/config/radar.config.json` and `/data/radar.json` (or `/data/radar.csv`) by default.

3. Build for production:

   ```bash
   npm run build
   npm run preview
   ```

## Data Sources

* Drop updated JSON or CSV exports from Notion into the `/data/` directory, or use the **Open file** button to load a file at runtime.
* CSV files must follow the header format described in the spec (`id,title,type,quadrant,ring,summary,...`).
* JSON files must contain a top-level `items` array with entries matching the required schema.

## Features

* Semi-circular radar with configurable quadrants, rings, and palette.
* Seeded jitter to separate nodes within each quadrant/ring bucket.
* Search and filter by type, quadrant, and ring.
* Zoom, pan, fullscreen toggle, and reset controls.
* Tooltips and an interactive side panel with markdown rendering, sources, and confidence/impact indicators.
* Offline-ready: no network calls beyond local asset loading.

## Project Structure

```
/config/radar.config.json   # radar configuration
/data/radar.json            # default dataset (sample)
/data/radar.csv             # sample CSV dataset
/src                        # React + D3 front-end
```
