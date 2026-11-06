import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Componente de Mapa Satelital que renderiza la delimitación del loteo Prados de Terranova
// con los 38 lotes de 20x30m (600m²), Área Social central, Portería en el bloque blanco inferior derecho
// y carreteras alineadas sobre las vías reales de Google Maps y la casa construida en el Lote 25.
export default function SatelliteMapCanvas({
  config,
  lots = [],
  overlays,
  selectedLotNumero,
  onSelectLot,
  editable = false,
  onMoveCenter,
  height = '540px',
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);
  const tileLayerRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('hybrid'); // 'hybrid' | 'satellite'
  const lastCenterRef = useRef(null);

  // Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = Number(config?.center_lat || 5.2881652);
    const initialLng = Number(config?.center_lng || -72.4658304);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 18,
      minZoom: 14,
      maxZoom: 21,
      zoomControl: true,
      attributionControl: false,
    });

    const tileUrl =
      mapStyle === 'hybrid'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 21,
      maxNativeZoom: 20,
    }).addTo(map);

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    lastCenterRef.current = `${initialLat.toFixed(6)},${initialLng.toFixed(6)}`;

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Cambiar proveedor satelital (Google Satélite Híbrido con etiquetas vs Google Satélite Puro limpio)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;
    const tileUrl =
      mapStyle === 'hybrid'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    tileLayerRef.current.setUrl(tileUrl);
  }, [mapStyle]);

  // Permitir clic en el mapa cuando está en modo edición para mover el centro si el usuario hace Shift+Clic
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e) => {
      if (editable && e.originalEvent.shiftKey && onMoveCenter) {
        onMoveCenter(Number(e.latlng.lat.toFixed(7)), Number(e.latlng.lng.toFixed(7)));
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [editable, onMoveCenter]);

  // Renderizar polígonos de los 38 lotes, carreteras, Área Social, Portería y perímetro
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (!overlays || !lots.length) return;

    // 1. Perímetro exterior punteado naranja/dorado
    if (overlays.perimeterCoords) {
      L.polygon(overlays.perimeterCoords, {
        color: '#e59949',
        weight: 2,
        opacity: 0.9,
        dashArray: '8, 7',
        fillColor: '#000000',
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(group);
    }

    // 2. Superficie de las Carreteras / Vías Internas (corredores viales sobre las vías reales)
    if (Array.isArray(overlays.roadPolygons)) {
      overlays.roadPolygons.forEach((polyCoords) => {
        L.polygon(polyCoords, {
          color: '#cbd5e1',
          weight: 1,
          opacity: 0.55,
          fillColor: '#334155',
          fillOpacity: 0.42,
          interactive: false,
        }).addTo(group);
      });
    }

    // Líneas centrales de las carreteras internas (Norte, Sur, Oeste)
    [
      overlays.northInternalRoadLine,
      overlays.southInternalRoadLine,
      overlays.westInternalRoadLine,
    ].forEach((roadLine) => {
      if (!roadLine) return;
      L.polyline(roadLine, {
        color: '#e2e8f0',
        weight: 2.5,
        opacity: 0.9,
        dashArray: '6, 6',
        interactive: false,
      }).addTo(group);
    });

    // Vía Principal Oriental (Acceso desde la Portería pasando por Lotes 1-5)
    if (overlays.mainRoadLine) {
      L.polyline(overlays.mainRoadLine, {
        color: '#f59e0b',
        weight: 3.5,
        opacity: 0.96,
        dashArray: '8, 5',
        interactive: false,
      }).addTo(group);
    }

    // 3. ÁREA SOCIAL en la mitad del proyecto (debajo de lotes 34, 33 y 32)
    if (overlays.socialAreaCoords) {
      L.polygon(overlays.socialAreaCoords, {
        color: '#eab308',
        weight: 2.2,
        opacity: 0.95,
        fillColor: '#16a34a',
        fillOpacity: 0.28,
        interactive: false,
      }).addTo(group);
    }

    if (overlays.socialAreaCenter) {
      const socialIcon = L.divIcon({
        className: 'social-map-label',
        html: `<div class="social-area-tag">🌴 ÁREA SOCIAL · ZONA RECREATIVA</div>`,
        iconSize: [210, 28],
        iconAnchor: [105, 14],
      });
      L.marker(overlays.socialAreaCenter, {
        icon: socialIcon,
        interactive: false,
      }).addTo(group);
    }

    // 4. PORTERÍA (bloque blanco en la esquina inferior derecha debajo del Lote 1)
    if (overlays.porteriaCoords) {
      L.polygon(overlays.porteriaCoords, {
        color: '#f8fafc',
        weight: 2.2,
        opacity: 1,
        fillColor: '#ffffff',
        fillOpacity: 0.72,
        interactive: false,
      }).addTo(group);
    }

    if (overlays.porteriaPosition) {
      const porteriaIcon = L.divIcon({
        className: 'porteria-map-label',
        html: `<div class="porteria-tag">PORTERÍA</div>`,
        iconSize: [96, 22],
        iconAnchor: [48, 11],
      });
      L.marker(overlays.porteriaPosition, {
        icon: porteriaIcon,
        interactive: false,
      }).addTo(group);
    }

    // 5. Pin de referencia del proyecto (Condominio Campestre Prados de Terranova)
    if (editable) {
      const pinHtml = `
        <div class="terranova-map-pin" title="Arrastra este pin para mover todo el loteo">
          <span class="pin-dot">📍</span>
          <span class="pin-text">Mover Centro del Loteo</span>
        </div>
      `;
      const projectMarker = L.marker([Number(config.center_lat), Number(config.center_lng)], {
        draggable: true,
        icon: L.divIcon({
          className: 'terranova-pin-wrapper',
          html: pinHtml,
          iconSize: [190, 30],
          iconAnchor: [95, -14],
        }),
      }).addTo(group);

      if (onMoveCenter) {
        projectMarker.on('dragend', (ev) => {
          const pos = ev.target.getLatLng();
          onMoveCenter(Number(pos.lat.toFixed(7)), Number(pos.lng.toFixed(7)));
        });
      }
    }

    // 6. Los 38 polígonos de lotes (L01 a L38) de 20x30m (600 m²)
    lots.forEach((lot) => {
      const coords = lot.coordenadas_geojson?.coordinates;
      if (!coords || !coords.length) return;

      const isSelected = Number(lot.numero_lote) === Number(selectedLotNumero);
      const labelShort = lot.labelShort || `L${String(lot.numero_lote).padStart(2, '0')}`;

      let strokeColor = '#5cd696';
      let fillColor = '#27ae60';
      let fillOpacity = 0.34;

      if (lot.estado === 'vendido') {
        strokeColor = '#f1948a';
        fillColor = '#e74c3c';
        fillOpacity = 0.4;
      } else if (lot.estado === 'reservado') {
        strokeColor = '#f8c471';
        fillColor = '#f39c12';
        fillOpacity = 0.4;
      }

      if (isSelected) {
        strokeColor = '#ffffff';
        fillOpacity = 0.54;
      }

      const polygon = L.polygon(coords, {
        color: strokeColor,
        weight: isSelected ? 3 : 1.6,
        opacity: 1,
        fillColor,
        fillOpacity,
      }).addTo(group);

      polygon.on('click', () => {
        if (onSelectLot) onSelectLot(lot.numero_lote, lot);
      });

      // Etiqueta central oscura tipo pastilla "L01".."L38"
      const lotLabelIcon = L.divIcon({
        className: 'lot-badge-wrapper',
        html: `<button type="button" class="lot-badge ${lot.estado} ${isSelected ? 'selected' : ''}">${labelShort}</button>`,
        iconSize: [40, 20],
        iconAnchor: [20, 10],
      });

      const labelMarker = L.marker([Number(lot.latitud), Number(lot.longitud)], {
        icon: lotLabelIcon,
      }).addTo(group);

      labelMarker.on('click', () => {
        if (onSelectLot) onSelectLot(lot.numero_lote, lot);
      });
    });

    // Centrar suavemente si cambió significativamente la ubicación
    const key = `${Number(config.center_lat).toFixed(5)},${Number(config.center_lng).toFixed(5)}`;
    if (lastCenterRef.current !== key) {
      lastCenterRef.current = key;
      map.panTo([Number(config.center_lat), Number(config.center_lng)], { animate: true });
    }
  }, [config, lots, overlays, selectedLotNumero, editable]);

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map || !config) return;
    map.setView([Number(config.center_lat), Number(config.center_lng)], 18, { animate: true });
  };

  return (
    <div className="sat-map-shell" style={{ height }}>
      <div className="sat-map-toolbar">
        <div className="sat-legend">
          <span className="legend-item">
            <i className="dot disp" /> Disponible
          </span>
          <span className="legend-item">
            <i className="dot res" /> Reservado
          </span>
          <span className="legend-item">
            <i className="dot vend" /> Vendido
          </span>
          <span className="legend-item">
            <i className="dot social" /> Área Social
          </span>
          <span className="legend-item">
            <i className="dot porteria" /> Portería
          </span>
          <span className="legend-item">
            <i className="line-int" /> Carreteras
          </span>
        </div>

        <div className="sat-controls">
          <button
            type="button"
            className={`sat-btn ${mapStyle === 'hybrid' ? 'active' : ''}`}
            onClick={() => setMapStyle('hybrid')}
          >
            Satélite + Vías
          </button>
          <button
            type="button"
            className={`sat-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapStyle('satellite')}
          >
            Satélite Puro
          </button>
          <button type="button" className="sat-btn" onClick={handleRecenter}>
            ⌖ Centrar Loteo
          </button>
        </div>
      </div>

      {editable && (
        <div className="sat-edit-banner">
          <span>
            Modo Edición Satelital activo: <strong>Arrastra el pin del proyecto</strong> o haz{' '}
            <strong>Shift + Clic</strong> sobre el mapa para mover la ubicación del loteo en vivo.
          </span>
        </div>
      )}

      <div ref={mapContainerRef} className="sat-leaflet-container" />
    </div>
  );
}
