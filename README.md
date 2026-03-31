# GeoExplorer

GeoExplorer is an interactive 2D world map application that allows users to explore countries, view detailed geographic information, and test their knowledge through an engaging quiz mode.

---

## Live Demo

geo-explorer-coral.vercel.app

---

## Overview

GeoExplorer is designed to showcase modern frontend development for data-driven applications. It combines geospatial visualization, real-time API integration, and interactive UI/UX design into a single seamless experience.

---

## Why This Project Matters

This project demonstrates:

* Interactive geospatial user interfaces using modern libraries
* Integration of multiple real-time APIs
* Clean and user-focused information architecture
* Responsive and polished UI/UX design
* Practical problem-solving in frontend engineering

---

## Core Features

* Interactive 2D world map with clickable country boundaries
* Dynamic country highlighting and map focus
* Detailed country information panel:

  * Official name
  * Capital
  * Population
  * Area
  * Languages
* AI-style insights powered by live Wikipedia summaries
* Country search functionality
* Quiz mode with timed country-finder gameplay
* On-page accuracy disclaimer for transparency

---

## How It Works

### 1. Application Initialization

* Loads a Leaflet map using OpenStreetMap tiles
* Fetches and renders GeoJSON country boundaries as interactive layers

### 2. Country Exploration

* User clicks on a country
* Data is fetched from the REST Countries API
* Side panel updates with detailed country information

### 3. Context Enrichment

* Wikipedia REST API provides a summary
* Displayed as an AI-style insight for better context

### 4. Search Functionality

* User searches for a country by name
* Map automatically focuses and displays details

### 5. Quiz Mode

* Two players enter names, time limits, and number of rounds
* Random countries are selected
* Players score points by correctly identifying countries within the time limit

### 6. Accuracy Notice

* Includes a disclaimer indicating that data may not be 100% accurate

---

## Screenshots

### Explore View

![Explore View](screenshots/Screenshot%202026-03-31%20111218.png)

### Quiz Mode

![Quiz Mode](screenshots/Screenshot%202026-03-31%20111304.png)

---

## APIs and Data Sources

* REST Countries API – country metadata
* GeoJSON Countries Dataset – country boundaries
* Wikipedia REST API – summaries and insights
* OpenStreetMap – map tiles

---

## Tech Stack

* JavaScript (ES Modules)
* Vite
* Leaflet
* HTML5
* CSS3

---

## Local Development

```bash
npm install
npm run dev
```

---

## Production Build

```bash
npm run build
npm run preview
```

---

## Future Improvements

* 3D globe visualization
* Advanced quiz difficulty levels
* Leaderboard and scoring system
* Improved mobile experience
* Offline data caching

---

## Author

**Jaiv Patel**

* GitHub: https://github.com/JaivPatel07
* LinkedIn: https://www.linkedin.com/in/jaiv-patel-52040b308

---

## License

This project is open-source and available under the MIT License.

---
