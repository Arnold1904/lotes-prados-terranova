/**
 * PRADOS DE TERRANOVA — Visor Geoespacial Satelital Interactivo (38 Lotes de 20x30m = 600 m²)
 * Soporta Esri World Imagery, Google Satellite Hybrid, OpenStreetMap y Topográfico
 */

class GeospatialMapViewer {
  constructor() {
    this.map = null;
    this.baseLayers = {};
    this.currentBaseLayer = null;
    this.lotsLayerGroup = null;
    this.labelsLayerGroup = null;
    this.roadsLayerGroup = null;
    this.lotes = [];
    this.selectedLotId = null;
    this.centerLat = 4.862450;
    this.centerLng = -74.058320;
    this.statusFilter = 'todos';
  }

  init(config, lotes) {
    if (config) {
      this.centerLat = config.centerLat || this.centerLat;
      this.centerLng = config.centerLng || this.centerLng;
    }
    this.lotes = lotes || [];

    const container = document.getElementById('geospatial-map');
    if (!container) return;

    if (!this.map) {
      this.map = L.map('geospatial-map', {
        center: [this.centerLat, this.centerLng],
        zoom: 18,
        minZoom: 15,
        maxZoom: 21,
        zoomControl: true
      });

      this.baseLayers = {
        esri_sat: L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 21,
            maxNativeZoom: 19,
            attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics'
          }
        ),
        google_hybrid: L.tileLayer(
          'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          {
            maxZoom: 21,
            maxNativeZoom: 20,
            attribution: 'Map data &copy; Google Satellite Hybrid'
          }
        ),
        osm: L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 21,
            maxNativeZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }
        ),
        topo: L.tileLayer(
          'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 21,
            maxNativeZoom: 17,
            attribution: '&copy; OpenTopoMap'
          }
        )
      };

      this.currentBaseLayer = this.baseLayers.esri_sat.addTo(this.map);
      this.roadsLayerGroup = L.layerGroup().addTo(this.map);
      this.lotsLayerGroup = L.layerGroup().addTo(this.map);
      this.labelsLayerGroup = L.layerGroup().addTo(this.map);

      this.bindControls();
    }

    this.drawMasterplanInfrastructure();
    this.renderLotsPolygons();

    const initialLot = this.lotes[0];
    if (initialLot) {
      this.selectLotOnMap(initialLot.id, false);
    }
  }

  bindControls() {
    const layerSelect = document.getElementById('map-layer-selector');
    if (layerSelect) {
      layerSelect.addEventListener('change', (e) => {
        const key = e.target.value;
        if (this.currentBaseLayer) {
          this.map.removeLayer(this.currentBaseLayer);
        }
        this.currentBaseLayer = this.baseLayers[key] || this.baseLayers.esri_sat;
        this.currentBaseLayer.addTo(this.map);
      });
    }

    const filterSelect = document.getElementById('map-status-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.renderLotsPolygons();
      });
    }

    const btnCenter = document.getElementById('btn-map-center');
    if (btnCenter) {
      btnCenter.addEventListener('click', () => {
        if (this.map) {
          this.map.setView([this.centerLat, this.centerLng], 18, { animate: true });
        }
      });
    }
  }

  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 150);
    }
  }

  updateLots(lotes) {
    this.lotes = lotes || [];
    if (this.map) {
      this.renderLotsPolygons();
      if (this.selectedLotId) {
        this.selectLotOnMap(this.selectedLotId, false);
      }
    }
  }

  metersToLatLng(eastMeters, northMeters) {
    const latRad = (this.centerLat * Math.PI) / 180;
    const dLat = northMeters / 111320;
    const dLng = eastMeters / (111320 * Math.cos(latRad));
    return [this.centerLat + dLat, this.centerLng + dLng];
  }

  drawMasterplanInfrastructure() {
    if (!this.roadsLayerGroup) return;
    this.roadsLayerGroup.clearLayers();

    // Perímetro General de la Parcelación Prados de Terranova
    const boundaryCoords = [
      this.metersToLatLng(-128, -90),
      this.metersToLatLng(128, -90),
      this.metersToLatLng(128, 98),
      this.metersToLatLng(-128, 98)
    ];

    L.polygon(boundaryCoords, {
      color: '#f0a854',
      weight: 2,
      dashArray: '8, 6',
      fillColor: '#0b1914',
      fillOpacity: 0.18,
      interactive: false
    }).addTo(this.roadsLayerGroup);

    // Vías internas entre manzanas
    const roadNorth = [this.metersToLatLng(-120, 48), this.metersToLatLng(120, 48)];
    const roadBoulevard = [this.metersToLatLng(-125, 4), this.metersToLatLng(125, 4)];
    const roadSouth = [this.metersToLatLng(-120, -39), this.metersToLatLng(120, -39)];

    [roadNorth, roadBoulevard, roadSouth].forEach((coords, i) => {
      L.polyline(coords, {
        color: i === 1 ? '#f0a854' : '#cbd5e1',
        weight: i === 1 ? 6 : 4,
        opacity: 0.75,
        dashArray: i === 1 ? null : '5, 5',
        interactive: false
      }).addTo(this.roadsLayerGroup);
    });

    // Marcador de Portería Principal y Casa Club
    const gatePos = this.metersToLatLng(-125, 4);
    const gateIcon = L.divIcon({
      className: 'lot-map-label',
      html: '⛩️ PORTERÍA PRINCIPAL',
      iconSize: [130, 20]
    });
    L.marker(gatePos, { icon: gateIcon }).addTo(this.roadsLayerGroup);
  }

  getLotColor(estado) {
    if (estado === 'disponible') return { stroke: '#10b981', fill: '#10b981' };
    if (estado === 'reservado') return { stroke: '#f59e0b', fill: '#f59e0b' };
    return { stroke: '#e11d48', fill: '#e11d48' };
  }

  renderLotsPolygons() {
    if (!this.lotsLayerGroup || !this.labelsLayerGroup) return;
    this.lotsLayerGroup.clearLayers();
    this.labelsLayerGroup.clearLayers();

    let countDisp = 0;
    let countRes = 0;
    let countVend = 0;

    this.lotes.forEach((lote) => {
      if (lote.estado === 'disponible') countDisp++;
      else if (lote.estado === 'reservado') countRes++;
      else countVend++;

      if (this.statusFilter !== 'todos' && lote.estado !== this.statusFilter) {
        return;
      }

      const geo = lote.coordenadas_geojson;
      if (!geo || !Array.isArray(geo.coordinates)) return;

      const palette = this.getLotColor(lote.estado);
      const isSelected = this.selectedLotId === lote.id;

      const polygon = L.polygon(geo.coordinates, {
        color: isSelected ? '#ffffff' : palette.stroke,
        weight: isSelected ? 3 : 1.8,
        fillColor: palette.fill,
        fillOpacity: isSelected ? 0.62 : 0.36
      });

      const fmt = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-CO');
      polygon.bindTooltip(
        `<div style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px;">
          <strong>${lote.codigo} (${lote.manzana})</strong><br/>
          <span>Medidas: 20.00m × 30.00m = <strong>600.00 m²</strong></span><br/>
          <span>Valor: <strong>${fmt(lote.precio_total)}</strong></span><br/>
          <span>Estado: <strong>${lote.estado.toUpperCase()}</strong></span>
        </div>`,
        { sticky: true }
      );

      polygon.on('click', () => {
        this.selectLotOnMap(lote.id, true);
      });

      polygon.addTo(this.lotsLayerGroup);

      // Etiqueta de número de lote centrada
      const labelIcon = L.divIcon({
        className: 'lot-map-label',
        html: `L${String(lote.numero_lote).padStart(2, '0')}`,
        iconSize: [32, 16],
        iconAnchor: [16, 8]
      });

      const marker = L.marker([lote.latitud, lote.longitud], {
        icon: labelIcon,
        interactive: false
      });
      marker.addTo(this.labelsLayerGroup);
    });

    const elDisp = document.getElementById('map-count-disp');
    const elRes = document.getElementById('map-count-res');
    const elVend = document.getElementById('map-count-vend');
    if (elDisp) elDisp.textContent = countDisp;
    if (elRes) elRes.textContent = countRes;
    if (elVend) elVend.textContent = countVend;
  }

  selectLotOnMap(loteId, panTo = true) {
    this.selectedLotId = Number(loteId);
    const lote = this.lotes.find((l) => l.id === this.selectedLotId);
    if (!lote) return;

    this.renderLotsPolygons();

    if (panTo && this.map) {
      this.map.panTo([lote.latitud, lote.longitud], { animate: true });
    }

    this.renderInspectorPanel(lote);
  }

  renderInspectorPanel(lote) {
    const panel = document.getElementById('map-lot-inspector');
    if (!panel) return;

    const fmt = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-CO');
    const rc = lote.render_config || {};
    const modelLabels = {
      villa_terranova_1p: 'Villa Terranova 1 Piso (145 m²)',
      residencia_imperial_2p: 'Residencia Imperial 2 Pisos (240 m²)',
      ecolodge_minimalista: 'Eco-Lodge Minimalista (185 m²)',
      solo_terreno_600m2: 'Solo Lote Acotado (600 m²)'
    };

    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
        <span class="mono" style="font-size:0.82rem; font-weight:700; color:var(--gold-primary);">
          ${lote.codigo} · ${lote.manzana}
        </span>
        <span class="status-badge ${lote.estado}">${lote.estado.toUpperCase()}</span>
      </div>

      <h3 class="serif" style="font-size:1.65rem; margin-bottom:0.25rem;">
        Lote Campestre #${String(lote.numero_lote).padStart(2, '0')}
      </h3>
      <p style="font-size:0.8rem; color:var(--text-muted-light); margin-bottom:0.9rem;">
        Matrícula: <strong class="mono">${lote.matricula_inmobiliaria || '050N-2026'}</strong> · ${lote.orientacion}
      </p>

      <div style="background:var(--bg-alabaster); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:0.9rem; margin-bottom:1rem;">
        <div style="font-size:0.74rem; color:var(--text-muted-light); text-transform:uppercase;">Valor Comercial Lote (600 m²)</div>
        <div class="mono" style="font-size:1.45rem; font-weight:700; color:var(--text-ink);">${fmt(lote.precio_total)}</div>
        <div class="mono" style="font-size:0.76rem; color:var(--gold-primary);">
          Frente: ${lote.frente_m.toFixed(2)}m × Fondo: ${lote.fondo_m.toFixed(2)}m = ${lote.area_m2.toFixed(2)} m² (${fmt(lote.precio_m2)}/m²)
        </div>
      </div>

      <div style="font-size:0.8rem; display:grid; gap:0.45rem; margin-bottom:1rem;">
        <div><strong>📍 Coordenadas GPS:</strong> <span class="mono">${lote.latitud.toFixed(6)}, ${lote.longitud.toFixed(6)}</span></div>
        <div><strong>⛰️ Topografía:</strong> ${lote.topografia}</div>
        <div><strong>🛣️ Vía de Acceso:</strong> ${lote.via_acceso}</div>
        <div><strong>🏠 Proyecto Render 3D:</strong> ${modelLabels[rc.model] || 'Villa Terranova 1 Piso'}</div>
        <div><strong>🧭 Lindero Norte:</strong> ${lote.lindero_norte}</div>
        <div><strong>🧭 Lindero Sur:</strong> ${lote.lindero_sur}</div>
      </div>

      ${
        lote.cliente_nombre
          ? `
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:var(--radius-sm); padding:0.85rem; margin-bottom:1rem; font-size:0.8rem;">
          <strong style="color:#166534; display:block; margin-bottom:0.25rem;">👤 Adjudicado a: ${lote.cliente_nombre}</strong>
          <div class="mono">Contrato: ${lote.codigo_contrato || 'Activo'}</div>
          <div class="mono">Total Abonado: <strong>${fmt(lote.total_abonado)}</strong></div>
          <div class="mono" style="color:#b45309;">Saldo Pendiente: <strong>${fmt(lote.saldo_pendiente)}</strong></div>
        </div>
      `
          : ''
      }

      <div style="display:flex; flex-direction:column; gap:0.55rem;">
        <button class="btn btn-gold btn-sm" style="width:100%;" onclick="window.app.openLotIn3DStudio(${lote.id})">
          🏠 Diseñar / Ver Casa Render 3D en este Lote
        </button>
        ${
          lote.estado === 'disponible'
            ? `<button class="btn btn-emerald btn-sm" style="width:100%;" onclick="window.app.openNewSaleModal(${lote.id})">
                ➕ Adjudicar / Vender este Lote
              </button>`
            : `<button class="btn btn-emerald btn-sm" style="width:100%;" onclick="window.app.openNewAbonoModal(${lote.venta_id || ''})">
                💵 Registrar Abono a este Lote
              </button>`
        }
        <button class="btn btn-outline-dark btn-sm" style="width:100%;" onclick="window.app.openLotDossierModal(${lote.id})">
          📋 Ver Expediente Técnico & Contable Completo
        </button>
      </div>
    `;
  }
}

window.geospatialViewer = new GeospatialMapViewer();
