---
name: frontend-design
description: >-
  Architectural and luxury real-estate frontend design system skill. Use this skill
  when designing and building web interfaces, interactive landing pages with Anime.js,
  3D architectural visualizers (Three.js), geospatial masterplans, and financial/accounting
  dashboards to ensure high-craft aesthetic quality, editorial typography, and tactile UI polish.
---

# Frontend Design Skill — Architectural & Real Estate Edition

This skill enforces high-craft design standards for real estate, geospatial masterplanning, 3D architectural rendering, and financial management interfaces.

## 1. Aesthetic Direction & Color Palette ("Prados de Terranova")
- **Concept**: Organic Luxury Architecture & Geospatial Precision.
- **Primary Surfaces**:
  - Deep Forest Night (`#0B1914`) & Moss Obsidian (`#11241D`) for dark architectural headers, 3D studio frames, and hero sections.
  - Warm Alabaster Stone (`#F7F5F0`) & Sand Linen (`#EFECE4`) for crisp, readable accounting tables and lot registries.
- **Accent & Semantic Colors**:
  - **Architectural Gold / Terracotta (`#D97706` / `#E09F3E`)**: Primary interactive highlights, 3D active states, and executive KPIs.
  - **Available Lot (`#10B981` - Emerald Green)**: Lotes disponibles (20×30m = 600 m²).
  - **Reserved Lot (`#F59E0B` - Amber Ochre)**: Lotes reservados en proceso de promesa.
  - **Sold Lot (`#E11D48` / `#BE123C` - Crimson Terra)**: Lotes vendidos / escriturados.

## 2. Typography Hierarchy
- **Display & Architectural Headings**: `'Cormorant Garamond'`, serif — evokes luxury architectural monographs and masterplans.
- **UI & Body Copy**: `'Plus Jakarta Sans'`, sans-serif — high legibility across forms, modals, and CRM cards.
- **Technical Metrics, Dimensions (20×30m = 600m²), Coordinates & Accounting Figures**: `'JetBrains Mono'`, monospace — ensures tabular alignment for prices, balances, and GPS coordinates.

## 3. Anime.js Choreography Guidelines
- **SVG Blueprint Drawing**: Animate architectural floorplans and lot boundaries using `anime.setDashoffset` with `easeInOutSine`.
- **38-Lot Interactive Stagger Grid**: Use `anime.stagger([35, 35], { grid: [10, 4], from: index })` with `easeOutElastic(1, .6)` when users click or filter lots on the landing page.
- **Numeric Counters**: Animate area (`600 m²`), dimensions (`20m × 30m`), and financial totals smoothly from `0` to target value.
- **Login & Modal Transitions**: Use spring physics or `easeOutExpo` for clean, responsive entry/exit transitions.

## 4. Spatial & 3D Viewport Principles
- Keep geospatial (Leaflet/Satellite) and 3D WebGL (Three.js) viewports unobstructed by floating glassmorphic HUD panels (`backdrop-filter: blur(16px)`).
- Always display clear scale cues: `20.00m Frente × 30.00m Fondo = 600.00 m²` in both 2D and 3D views.
