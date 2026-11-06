/**
 * PRADOS DE TERRANOVA — Landing Page & Login Choreography with Anime.js
 */

class LandingAnimeController {
  constructor() {
    this.lotes = [];
    this.selectedLot = null;
    this.currentFilter = 'todos';
  }

  init(lotes, stats) {
    this.lotes = lotes || [];
    this.bindEvents();
    this.animateHeroEntry();
    this.animateBlueprintSVG();
    this.animateHeroCounters(stats);
    this.renderInteractive38Matrix();

    // Seleccionar el primer lote disponible por defecto
    const firstAvailable = this.lotes.find((l) => l.estado === 'disponible') || this.lotes[0];
    if (firstAvailable) {
      this.selectLot(firstAvailable, 0, false);
    }
  }

  updateData(lotes, stats) {
    this.lotes = lotes || [];
    const liveCounter = document.getElementById('landing-live-counter');
    if (liveCounter && stats) {
      liveCounter.textContent = `${stats.disponibles} de 38 Lotes Disponibles (600 m²)`;
    }
    this.renderInteractive38Matrix();
    if (this.selectedLot) {
      const updated = this.lotes.find((l) => l.id === this.selectedLot.id) || this.lotes[0];
      if (updated) this.selectLot(updated, updated.numero_lote - 1, false);
    }
  }

  bindEvents() {
    const btnReplay = document.getElementById('btn-replay-blueprint');
    if (btnReplay) {
      btnReplay.addEventListener('click', () => this.animateBlueprintSVG());
    }

    const btnWave = document.getElementById('btn-trigger-wave');
    if (btnWave) {
      btnWave.addEventListener('click', () => {
        const centerIdx = this.selectedLot ? this.selectedLot.numero_lote - 1 : 'center';
        this.triggerStaggerWave(centerIdx);
      });
    }

    const filterContainer = document.getElementById('landing-filter-pills');
    if (filterContainer) {
      filterContainer.querySelectorAll('.filter-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
          filterContainer.querySelectorAll('.filter-pill').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentFilter = btn.dataset.filter;
          this.applyFilterWithAnime(this.currentFilter);
        });
      });
    }

    // Botones del Spotlight que llevan al Render 3D o al Mapa Satelital
    const btnSpot3D = document.getElementById('btn-spot-open-3d');
    if (btnSpot3D) {
      btnSpot3D.addEventListener('click', () => {
        if (window.app) {
          window.app.openLotIn3DFromLanding(this.selectedLot ? this.selectedLot.id : 1);
        }
      });
    }

    const btnSpotMap = document.getElementById('btn-spot-open-map');
    if (btnSpotMap) {
      btnSpotMap.addEventListener('click', () => {
        if (window.app) {
          window.app.openLotInMapFromLanding(this.selectedLot ? this.selectedLot.id : 1);
        }
      });
    }
  }

  animateHeroEntry() {
    if (typeof anime === 'undefined') return;

    anime.timeline({ easing: 'easeOutExpo' })
      .add({
        targets: '.hero-copy-col > *',
        translateY: [28, 0],
        opacity: [0, 1],
        duration: 900,
        delay: anime.stagger(110)
      })
      .add({
        targets: '.hero-blueprint-card',
        scale: [0.94, 1],
        opacity: [0, 1],
        duration: 950
      }, '-=650');
  }

  animateBlueprintSVG() {
    if (typeof anime === 'undefined') return;

    const lines = document.querySelectorAll('#architectural-blueprint-svg .bp-line');
    const nodes = document.querySelectorAll('#architectural-blueprint-svg .bp-node');

    anime({
      targets: lines,
      strokeDashoffset: [anime.setDashoffset, 0],
      easing: 'easeInOutSine',
      duration: 1300,
      delay: anime.stagger(75)
    });

    anime({
      targets: nodes,
      scale: [0, 1],
      opacity: [0, 1],
      easing: 'easeOutBack',
      duration: 750,
      delay: anime.stagger(150, { start: 600 })
    });
  }

  animateHeroCounters(stats) {
    if (typeof anime === 'undefined' || !stats) return;

    const counterObj = {
      lots: 0,
      area: 0,
      available: 0,
      totalArea: 0
    };

    const elLots = document.getElementById('anime-counter-lots');
    const elArea = document.getElementById('anime-counter-area');
    const elAvail = document.getElementById('anime-counter-available');
    const elTotalArea = document.getElementById('anime-counter-total-area');
    const livePill = document.getElementById('landing-live-counter');

    if (livePill) {
      livePill.textContent = `${stats.disponibles} de 38 Lotes Disponibles (600 m²)`;
    }

    anime({
      targets: counterObj,
      lots: stats.total || 38,
      area: 600,
      available: stats.disponibles || 20,
      totalArea: (stats.total || 38) * 600,
      round: 1,
      easing: 'easeOutExpo',
      duration: 2100,
      update: () => {
        if (elLots) elLots.textContent = counterObj.lots;
        if (elArea) elArea.textContent = counterObj.area;
        if (elAvail) elAvail.textContent = counterObj.available;
        if (elTotalArea) elTotalArea.textContent = counterObj.totalArea.toLocaleString('es-CO');
      }
    });
  }

  renderInteractive38Matrix() {
    const grid = document.getElementById('landing-lots-grid');
    if (!grid) return;

    grid.innerHTML = '';

    this.lotes.forEach((lote, idx) => {
      const tile = document.createElement('div');
      tile.className = `lot-tile-anime ${lote.estado}`;
      tile.dataset.id = lote.id;
      tile.dataset.index = idx;
      tile.dataset.estado = lote.estado;
      tile.dataset.manzana = lote.manzana;

      if (this.selectedLot && this.selectedLot.id === lote.id) {
        tile.classList.add('selected');
      }

      tile.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="lot-tile-num">#${String(lote.numero_lote).padStart(2, '0')}</span>
          <span style="font-size:0.55rem; text-transform:uppercase;">${lote.estado.slice(0, 4)}</span>
        </div>
        <div class="lot-tile-code">${lote.codigo}</div>
        <div class="lot-tile-dim">20×30m · 600m²</div>
      `;

      tile.addEventListener('click', () => {
        this.selectLot(lote, idx, true);
      });

      grid.appendChild(tile);
    });

    this.triggerStaggerWave('center');
  }

  triggerStaggerWave(fromOrigin = 'center') {
    if (typeof anime === 'undefined') return;
    const tiles = document.querySelectorAll('#landing-lots-grid .lot-tile-anime');
    if (!tiles.length) return;

    anime.remove(tiles);
    anime({
      targets: tiles,
      scale: [
        { value: 0.86, easing: 'easeOutSine', duration: 160 },
        { value: 1, easing: 'easeOutElastic(1, .6)', duration: 750 }
      ],
      translateY: [
        { value: -6, easing: 'easeOutSine', duration: 160 },
        { value: 0, easing: 'easeOutElastic(1, .6)', duration: 750 }
      ],
      delay: anime.stagger(38, { grid: [10, 4], from: fromOrigin })
    });
  }

  applyFilterWithAnime(filterValue) {
    const tiles = document.querySelectorAll('#landing-lots-grid .lot-tile-anime');
    tiles.forEach((tile) => {
      const matches =
        filterValue === 'todos' ||
        tile.dataset.estado === filterValue ||
        tile.dataset.manzana === filterValue;

      if (typeof anime !== 'undefined') {
        anime({
          targets: tile,
          opacity: matches ? 1 : 0.2,
          scale: matches ? 1 : 0.9,
          duration: 450,
          easing: 'easeOutCubic'
        });
      } else {
        tile.style.opacity = matches ? '1' : '0.2';
      }
    });
  }

  selectLot(lote, index, withWave = true) {
    this.selectedLot = lote;

    document.querySelectorAll('#landing-lots-grid .lot-tile-anime').forEach((el) => {
      el.classList.toggle('selected', Number(el.dataset.id) === lote.id);
    });

    if (withWave) {
      this.triggerStaggerWave(index);
    }

    // Actualizar tarjeta Spotlight
    const fmt = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-CO');
    const elCodigo = document.getElementById('spot-codigo');
    const elBadge = document.getElementById('spot-estado-badge');
    const elTitulo = document.getElementById('spot-titulo');
    const elDesc = document.getElementById('spot-desc');
    const elPrecio = document.getElementById('spot-precio');
    const elDim = document.getElementById('spot-dimensiones');
    const elArea = document.getElementById('spot-area');
    const elPrecioM2 = document.getElementById('spot-precio-m2');
    const elCoords = document.getElementById('spot-coords');
    const elInicial = document.getElementById('spot-cuota-inicial');
    const elMensual = document.getElementById('spot-cuota-mensual');

    if (elCodigo) elCodigo.textContent = `${lote.codigo} · ${lote.manzana}`;
    if (elBadge) {
      elBadge.className = `status-badge ${lote.estado}`;
      elBadge.textContent = lote.estado.toUpperCase();
    }
    if (elTitulo) elTitulo.textContent = `Lote Campestre #${String(lote.numero_lote).padStart(2, '0')}`;
    if (elDesc) elDesc.textContent = lote.descripcion || 'Lote de 20m x 30m (600 m²) con acometidas subterráneas.';
    if (elDim) elDim.textContent = `${lote.frente_m.toFixed(2)}m × ${lote.fondo_m.toFixed(2)}m`;
    if (elArea) elArea.textContent = `${lote.area_m2.toFixed(2)} m²`;
    if (elPrecioM2) elPrecioM2.textContent = `${fmt(lote.precio_m2)} /m²`;
    if (elCoords) elCoords.textContent = `${lote.latitud.toFixed(4)}, ${lote.longitud.toFixed(4)}`;

    const cuotaInicial30 = lote.precio_total * 0.3;
    const cuotaMensual24 = (lote.precio_total - cuotaInicial30) / 24;
    if (elInicial) elInicial.textContent = fmt(cuotaInicial30);
    if (elMensual) elMensual.textContent = `${fmt(cuotaMensual24)} /mes`;

    // Animar el precio con Anime.js
    if (typeof anime !== 'undefined' && elPrecio) {
      const priceObj = { val: lote.precio_total * 0.85 };
      anime({
        targets: priceObj,
        val: lote.precio_total,
        round: 1,
        duration: 550,
        easing: 'easeOutQuad',
        update: () => {
          elPrecio.textContent = fmt(priceObj.val);
        }
      });

      anime({
        targets: '#landing-spotlight-card',
        translateY: [-5, 0],
        duration: 420,
        easing: 'easeOutQuad'
      });
    } else if (elPrecio) {
      elPrecio.textContent = fmt(lote.precio_total);
    }

    // Actualizar barra de distribución de los 600 m² según la configuración 3D del lote
    const rc = lote.render_config || {};
    const houseM2 = Number(rc.builtAreaM2 || 165);
    const poolM2 = rc.hasPool !== false ? 72 : 28;
    const gardenM2 = Math.max(0, 600 - houseM2 - poolM2);

    const segHouse = document.getElementById('bar-seg-house');
    const segPool = document.getElementById('bar-seg-pool');
    const segGarden = document.getElementById('bar-seg-garden');

    if (segHouse) segHouse.style.width = `${((houseM2 / 600) * 100).toFixed(1)}%`;
    if (segPool) segPool.style.width = `${((poolM2 / 600) * 100).toFixed(1)}%`;
    if (segGarden) segGarden.style.width = `${((gardenM2 / 600) * 100).toFixed(1)}%`;

    const lblHouse = document.getElementById('lbl-m2-house');
    const lblPool = document.getElementById('lbl-m2-pool');
    const lblGarden = document.getElementById('lbl-m2-garden');
    const lblModel = document.getElementById('breakdown-model-label');

    if (lblHouse) lblHouse.textContent = `${houseM2} m²`;
    if (lblPool) lblPool.textContent = `${poolM2} m²`;
    if (lblGarden) lblGarden.textContent = `${gardenM2} m²`;

    const modelNames = {
      villa_terranova_1p: 'Villa Terranova 1 Piso',
      residencia_imperial_2p: 'Residencia Imperial 2 Pisos',
      ecolodge_minimalista: 'Eco-Lodge Minimalista'
    };
    if (lblModel) {
      lblModel.textContent = `${modelNames[rc.model] || 'Villa Campestre 3D'} (${houseM2} m²)`;
    }
  }

  animateLoginOpen() {
    if (typeof anime === 'undefined') return;
    anime({
      targets: '#login-modal-card',
      scale: [0.88, 1],
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 520,
      easing: 'easeOutExpo'
    });
  }

  animateLoginError() {
    if (typeof anime === 'undefined') return;
    anime({
      targets: '#login-modal-card',
      translateX: [-12, 12, -8, 8, -4, 4, 0],
      duration: 480,
      easing: 'easeInOutSine'
    });
  }
}

window.landingAnime = new LandingAnimeController();
