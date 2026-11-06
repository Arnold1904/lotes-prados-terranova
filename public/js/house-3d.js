/**
 * PRADOS DE TERRANOVA — Estudio de Render 3D Fotorrealista (ArchViz PBR)
 * Casa Moderna de Lujo con Mucho Vidrio (Curtain Walls Piso-Techo + Interior Amueblado)
 * Terreno a Escala Exacta: 20.00m Frente x 30.00m Fondo = 600.00 m²
 */

class House3DStudio {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.pmremGenerator = null;
    this.envMap = null;
    this.skyDome = null;

    this.houseGroup = null;
    this.dimensionsGroup = null;
    this.nightLights = [];
    this.emissiveMeshes = [];
    this.flameMeshes = [];
    this.poolWaterMesh = null;
    this.reflectingPoolMesh = null;

    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;

    this.textures = {};
    this.lotes = [];
    this.currentLot = null;
    this.showDimensions = true;
    this.autoRotate = false;
    this.clock = new THREE.Clock();

    this.config = {
      model: 'villa_terranova_1p',
      facadeColor: '#F4F1EA',
      roofColor: '#263238',
      glassTint: '#cceeff',
      hasPool: true,
      hasPergola: true,
      hasGarage: true,
      hasSolarPanels: false,
      sunHour: 16.5
    };
  }

  init(lotes) {
    this.lotes = lotes || [];
    this.populateLotSelector();

    const container = document.getElementById('threejs-canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    if (!this.renderer) {
      const width = container.clientWidth || 900;
      const height = container.clientHeight || 640;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0c1d17);
      this.scene.fog = new THREE.FogExp2(0x0c1d17, 0.0045);

      this.camera = new THREE.PerspectiveCamera(40, width / height, 0.3, 500);
      this.camera.position.set(22, 14, 28);

      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      if (THREE.sRGBEncoding) {
        this.renderer.outputEncoding = THREE.sRGBEncoding;
      }

      container.innerHTML = '';
      container.appendChild(this.renderer.domElement);

      this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.pmremGenerator.compileEquirectangularShader();

      if (THREE.OrbitControls) {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.015;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 85;
        this.controls.target.set(0, 2.4, 0);
      }

      this.generateProceduralPBRTextures();
      this.updateEnvironmentMap(this.config.sunHour);
      this.setupLighting();
      this.buildSkyDome();
      this.buildBaseTerrain20x30();

      this.houseGroup = new THREE.Group();
      this.scene.add(this.houseGroup);

      this.dimensionsGroup = new THREE.Group();
      this.scene.add(this.dimensionsGroup);
      this.buildDimensionMarkers20x30();

      this.bindUIControls();
      window.addEventListener('resize', () => this.handleResize());

      this.animate();
    }

    if (this.lotes.length > 0) {
      this.loadLotIntoStudio(this.lotes[0].id);
    } else {
      this.rebuild3DHouse();
    }
  }

  handleResize() {
    const container = document.getElementById('threejs-canvas-container');
    if (!container || !this.renderer || !this.camera) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w > 0 && h > 0) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  // ==========================================================================
  // 1. GENERADOR DE TEXTURAS PROCEDURALES PBR & ENVIRONMENT MAP HDRI
  // ==========================================================================
  generateProceduralPBRTextures() {
    // 1. Textura de Madera Teca Entablonada (Deck, Plafones, Escalera, Celosías)
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 1024;
    woodCanvas.height = 1024;
    const wCtx = woodCanvas.getContext('2d');
    wCtx.fillStyle = '#8b5a2b';
    wCtx.fillRect(0, 0, 1024, 1024);

    const plankCount = 16;
    const plankH = 1024 / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const y = i * plankH;
      const toneShift = (i % 3) * 8 - 8;
      wCtx.fillStyle = `rgb(${142 + toneShift}, ${88 + toneShift}, ${44 + Math.floor(toneShift / 2)})`;
      wCtx.fillRect(0, y + 2, 1024, plankH - 3);

      // Vetas de la madera
      wCtx.strokeStyle = 'rgba(60, 32, 12, 0.18)';
      wCtx.lineWidth = 2;
      for (let v = 0; v < 14; v++) {
        wCtx.beginPath();
        const vy = y + 6 + (v * (plankH - 10)) / 14;
        wCtx.moveTo(0, vy);
        wCtx.bezierCurveTo(340, vy + ((v % 2) * 4 - 2), 680, vy - ((v % 2) * 4 - 2), 1024, vy);
        wCtx.stroke();
      }

      // Junta oscura entre tablones
      wCtx.fillStyle = '#2d180a';
      wCtx.fillRect(0, y, 1024, 2.5);
    }
    const woodTex = new THREE.CanvasTexture(woodCanvas);
    woodTex.wrapS = THREE.RepeatWrapping;
    woodTex.wrapT = THREE.RepeatWrapping;
    woodTex.repeat.set(3, 3);

    // 2. Textura de Piedra / Mármol Travertino (Pisos interiores, Isla, Muros)
    const stoneCanvas = document.createElement('canvas');
    stoneCanvas.width = 1024;
    stoneCanvas.height = 1024;
    const sCtx = stoneCanvas.getContext('2d');
    sCtx.fillStyle = '#ece8df';
    sCtx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 180; i++) {
      sCtx.fillStyle = i % 2 === 0 ? 'rgba(210, 200, 185, 0.25)' : 'rgba(255, 255, 255, 0.28)';
      sCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 90 + Math.random() * 180, 4 + Math.random() * 10);
    }
    // Retícula de baldosas de gran formato
    sCtx.strokeStyle = 'rgba(140, 132, 120, 0.35)';
    sCtx.lineWidth = 3;
    for (let g = 0; g <= 1024; g += 256) {
      sCtx.beginPath();
      sCtx.moveTo(g, 0);
      sCtx.lineTo(g, 1024);
      sCtx.moveTo(0, g);
      sCtx.lineTo(1024, g);
      sCtx.stroke();
    }
    const stoneTex = new THREE.CanvasTexture(stoneCanvas);
    stoneTex.wrapS = THREE.RepeatWrapping;
    stoneTex.wrapT = THREE.RepeatWrapping;
    stoneTex.repeat.set(4, 4);

    // 3. Textura de Césped Arquitectónico Natural (Lote 20x30m)
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 1024;
    grassCanvas.height = 1024;
    const gCtx = grassCanvas.getContext('2d');
    gCtx.fillStyle = '#244e38';
    gCtx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 6500; i++) {
      gCtx.fillStyle = i % 3 === 0 ? '#2d6346' : (i % 3 === 1 ? '#1e422f' : '#357250');
      gCtx.fillRect(Math.random() * 1024, Math.random() * 1024, 3, 7);
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(10, 14);

    // 4. Textura de Agua Cristalina y Mosaico de Piscina
    const waterCanvas = document.createElement('canvas');
    waterCanvas.width = 512;
    waterCanvas.height = 512;
    const waCtx = waterCanvas.getContext('2d');
    waCtx.fillStyle = '#808080';
    waCtx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 20 + Math.random() * 45;
      const grad = waCtx.createRadialGradient(x, y, 2, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.45)');
      grad.addColorStop(1, 'rgba(128,128,128,0)');
      waCtx.fillStyle = grad;
      waCtx.beginPath();
      waCtx.arc(x, y, r, 0, Math.PI * 2);
      waCtx.fill();
    }
    const waterBump = new THREE.CanvasTexture(waterCanvas);
    waterBump.wrapS = THREE.RepeatWrapping;
    waterBump.wrapT = THREE.RepeatWrapping;
    waterBump.repeat.set(3, 3);

    this.textures = {
      wood: woodTex,
      stone: stoneTex,
      grass: grassTex,
      waterBump
    };
  }

  /**
   * Crea un Environment Map HDRI procedural en tiempo real para que los muros de vidrio
   * reflejen el cielo, el horizonte dorado y las luces arquitectónicas.
   */
  updateEnvironmentMap(hour) {
    if (!this.pmremGenerator || !this.scene) return;

    const envScene = new THREE.Scene();
    const isNight = hour >= 19 || hour <= 6.2;
    const isSunset = (hour >= 16.5 && hour < 19) || (hour > 6.2 && hour <= 7.8);

    const skyColorTop = isNight ? 0x050d14 : (isSunset ? 0x1e293b : 0x38bdf8);
    const skyColorHorizon = isNight ? 0x0f172a : (isSunset ? 0xf97316 : 0xe0f2fe);
    const groundColor = 0x132a21;

    const envLight = new THREE.HemisphereLight(skyColorTop, groundColor, isNight ? 0.4 : 1.4);
    envScene.add(envLight);

    // Esfera emisiva solar/lunar en el mapa de reflexión para brillos especulares en el vidrio
    const sunOrb = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 16),
      new THREE.MeshBasicMaterial({ color: isSunset ? 0xfdba74 : 0xffffff })
    );
    const norm = (hour - 6) / 14;
    const angle = norm * Math.PI;
    sunOrb.position.set(Math.cos(angle) * 45, Math.max(4, Math.sin(angle) * 45), 20);
    envScene.add(sunOrb);

    // Borde luminoso en el horizonte para reflejos tipo cristal arquitectónico
    const horizonRing = new THREE.Mesh(
      new THREE.CylinderGeometry(55, 55, 12, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: skyColorHorizon,
        side: THREE.BackSide
      })
    );
    horizonRing.position.y = 4;
    envScene.add(horizonRing);

    if (this.envMap) this.envMap.dispose();
    this.envMap = this.pmremGenerator.fromScene(envScene, 0.035).texture;
    this.scene.environment = this.envMap;
  }

  buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(220, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x16382c,
      side: THREE.BackSide
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  // ==========================================================================
  // 2. CONTROLES UI Y SINCRONIZACIÓN CON MYSQL
  // ==========================================================================
  populateLotSelector() {
    const select = document.getElementById('studio-select-lot');
    if (!select) return;
    select.innerHTML = this.lotes
      .map(
        (l) =>
          `<option value="${l.id}">${l.codigo} (${l.manzana}) — 20×30m = 600m² · $${Math.round(l.precio_total / 1000000)}M [${l.estado.toUpperCase()}]</option>`
      )
      .join('');
  }

  updateLotsList(lotes) {
    this.lotes = lotes || [];
    const currentId = this.currentLot ? this.currentLot.id : (this.lotes[0] && this.lotes[0].id);
    this.populateLotSelector();
    if (currentId) {
      const select = document.getElementById('studio-select-lot');
      if (select) select.value = String(currentId);
      this.currentLot = this.lotes.find((l) => l.id === Number(currentId)) || this.lotes[0];
      this.updateBudgetHUD();
    }
  }

  loadLotIntoStudio(lotId) {
    const lot = this.lotes.find((l) => l.id === Number(lotId)) || this.lotes[0];
    if (!lot) return;
    this.currentLot = lot;

    const select = document.getElementById('studio-select-lot');
    if (select) select.value = String(lot.id);

    const rc = lot.render_config || {};
    this.config.model = rc.model || 'villa_terranova_1p';
    this.config.facadeColor = rc.facadeColor || '#F4F1EA';
    this.config.roofColor = rc.roofColor || '#263238';
    this.config.glassTint = rc.glassTint || '#cceeff';
    this.config.hasPool = rc.hasPool !== undefined ? Boolean(rc.hasPool) : true;
    this.config.hasPergola = rc.hasPergola !== undefined ? Boolean(rc.hasPergola) : true;
    this.config.hasGarage = rc.hasGarage !== undefined ? Boolean(rc.hasGarage) : true;
    this.config.hasSolarPanels = Boolean(rc.hasSolarPanels);
    this.config.sunHour = Number(rc.sunHour || 16.5);

    this.syncControlsWithConfig();
    this.rebuild3DHouse();
    this.updateSunPosition(this.config.sunHour);
    this.updateBudgetHUD();
  }

  syncControlsWithConfig() {
    const modelSel = document.getElementById('studio-select-model');
    if (modelSel) modelSel.value = this.config.model;

    const glassSel = document.getElementById('studio-select-glass');
    if (glassSel) glassSel.value = this.config.glassTint;

    const chkPool = document.getElementById('chk-3d-pool');
    const chkPergola = document.getElementById('chk-3d-pergola');
    const chkGarage = document.getElementById('chk-3d-garage');
    const chkSolar = document.getElementById('chk-3d-solar');
    if (chkPool) chkPool.checked = this.config.hasPool;
    if (chkPergola) chkPergola.checked = this.config.hasPergola;
    if (chkGarage) chkGarage.checked = this.config.hasGarage;
    if (chkSolar) chkSolar.checked = this.config.hasSolarPanels;

    const sliderSun = document.getElementById('slider-sun-hour');
    if (sliderSun) sliderSun.value = this.config.sunHour;

    document.querySelectorAll('#facade-color-swatches .color-swatch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.color === this.config.facadeColor);
    });

    document.querySelectorAll('#roof-color-swatches .color-swatch-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.roof === this.config.roofColor);
    });
  }

  bindUIControls() {
    document.getElementById('studio-select-lot')?.addEventListener('change', (e) => {
      this.loadLotIntoStudio(Number(e.target.value));
    });

    document.getElementById('studio-select-model')?.addEventListener('change', (e) => {
      this.config.model = e.target.value;
      this.rebuild3DHouse();
      this.updateBudgetHUD();
    });

    document.getElementById('studio-select-glass')?.addEventListener('change', (e) => {
      this.config.glassTint = e.target.value;
      this.rebuild3DHouse();
    });

    document.querySelectorAll('#facade-color-swatches .color-swatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#facade-color-swatches .color-swatch-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.facadeColor = btn.dataset.color;
        this.rebuild3DHouse();
      });
    });

    document.querySelectorAll('#roof-color-swatches .color-swatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#roof-color-swatches .color-swatch-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.config.roofColor = btn.dataset.roof;
        this.rebuild3DHouse();
      });
    });

    ['pool', 'pergola', 'garage', 'solar'].forEach((key) => {
      document.getElementById(`chk-3d-${key}`)?.addEventListener('change', () => {
        this.config.hasPool = document.getElementById('chk-3d-pool').checked;
        this.config.hasPergola = document.getElementById('chk-3d-pergola').checked;
        this.config.hasGarage = document.getElementById('chk-3d-garage').checked;
        this.config.hasSolarPanels = document.getElementById('chk-3d-solar').checked;
        this.rebuild3DHouse();
        this.updateBudgetHUD();
      });
    });

    document.getElementById('slider-sun-hour')?.addEventListener('input', (e) => {
      this.config.sunHour = parseFloat(e.target.value);
      this.updateSunPosition(this.config.sunHour);
    });

    const btnDims = document.getElementById('btn-3d-toggle-dimensions');
    if (btnDims) {
      btnDims.addEventListener('click', () => {
        this.showDimensions = !this.showDimensions;
        if (this.dimensionsGroup) this.dimensionsGroup.visible = this.showDimensions;
        btnDims.textContent = `📏 Cotas 20×30m: ${this.showDimensions ? 'ON' : 'OFF'}`;
      });
    }

    const btnRotate = document.getElementById('btn-3d-Autorotate');
    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        this.autoRotate = !this.autoRotate;
        if (this.controls) {
          this.controls.autoRotate = this.autoRotate;
          this.controls.autoRotateSpeed = 1.4;
        }
        btnRotate.classList.toggle('btn-gold', this.autoRotate);
      });
    }

    document.getElementById('btn-3d-screenshot')?.addEventListener('click', () => this.captureScreenshot());

    document.querySelectorAll('.camera-presets-bar button').forEach((btn) => {
      btn.addEventListener('click', () => this.moveCameraToPreset(btn.dataset.cam));
    });

    document.getElementById('btn-save-3d-mysql')?.addEventListener('click', () => this.saveCurrent3DConfigToMySQL());

    document.getElementById('btn-sell-with-3d')?.addEventListener('click', () => {
      if (window.app && this.currentLot) {
        window.app.openNewSaleModal(this.currentLot.id, this.config.model, this.calculateHouseCost());
      }
    });
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x132a21, 0.55);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
    this.sunLight.position.set(28, 36, 22);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 120;
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);
  }

  // ==========================================================================
  // 3. TERRENO ACOTADO 20m x 30m = 600 m² Y PAISAJISMO EXTERIOR
  // ==========================================================================
  buildBaseTerrain20x30() {
    const envGroup = new THREE.Group();

    // Pradera circundante del condominio
    const meadow = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: 0x12261d, roughness: 0.96 })
    );
    meadow.rotation.x = -Math.PI / 2;
    meadow.position.y = -0.16;
    meadow.receiveShadow = true;
    envGroup.add(meadow);

    // Lote Exacto de 20.00m Frente x 30.00m Fondo = 600.00 m²
    const lotPlot = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.28, 30),
      new THREE.MeshStandardMaterial({
        map: this.textures.grass,
        bumpMap: this.textures.grass,
        bumpScale: 0.03,
        roughness: 0.88
      })
    );
    lotPlot.position.set(0, -0.04, 0);
    lotPlot.receiveShadow = true;
    envGroup.add(lotPlot);

    // Bordillo perimetral de concreto arquitectónico para los 20x30m
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xd6d3c9, roughness: 0.7 });
    const curbNorth = new THREE.Mesh(new THREE.BoxGeometry(20.3, 0.18, 0.25), curbMat);
    curbNorth.position.set(0, 0.06, -15.0);
    envGroup.add(curbNorth);

    const curbSouth = new THREE.Mesh(new THREE.BoxGeometry(20.3, 0.18, 0.25), curbMat);
    curbSouth.position.set(0, 0.06, 15.0);
    envGroup.add(curbSouth);

    // Vía Interna Adoquinada en el Frente del Lote (Z = +15.2 a +22.5)
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(48, 0.2, 7.2),
      new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.85 })
    );
    road.position.set(0, -0.05, 19.0);
    road.receiveShadow = true;
    envGroup.add(road);

    // Andén peatonal iluminado frente al lote
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(48, 0.16, 1.4),
      new THREE.MeshStandardMaterial({ map: this.textures.stone, roughness: 0.75 })
    );
    sidewalk.position.set(0, 0.03, 15.1);
    sidewalk.receiveShadow = true;
    envGroup.add(sidewalk);

    // Seto vivo perimetral bajo y elegante (para no tapar la arquitectura de cristal)
    const hedgeMat = new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.9 });
    const backHedge = new THREE.Mesh(new THREE.BoxGeometry(19.8, 1.15, 0.45), hedgeMat);
    backHedge.position.set(0, 0.58, -14.75);
    backHedge.castShadow = true;
    envGroup.add(backHedge);

    const leftHedge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 29.5), hedgeMat);
    leftHedge.position.set(-9.78, 0.58, 0);
    leftHedge.castShadow = true;
    envGroup.add(leftHedge);

    const rightHedge = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 29.5), hedgeMat);
    rightHedge.position.set(9.78, 0.58, 0);
    rightHedge.castShadow = true;
    envGroup.add(rightHedge);

    // Árboles ornamentales detallados (Cipreses y Árboles de Sombra)
    const treeLocations = [
      [-8.3, -12.8, 1.15, 'canopy'],
      [8.3, -12.6, 1.25, 'canopy'],
      [-8.5, 11.8, 1.0, 'cypress'],
      [8.5, 12.2, 1.05, 'cypress'],
      [-8.4, -3.5, 1.1, 'cypress'],
      [8.4, -8.5, 1.0, 'cypress']
    ];
    treeLocations.forEach(([x, z, scale, style]) => {
      envGroup.add(this.createDetailedTree(x, z, scale, style));
    });

    this.scene.add(envGroup);
  }

  createDetailedTree(x, z, scale = 1, style = 'canopy') {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.9 });
    const leafMat1 = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.78 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.75 });

    // Jardinera circular en piedra en la base del árbol
    const planter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85 * scale, 0.9 * scale, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0xd6d3c9, roughness: 0.8 })
    );
    planter.position.y = 0.11;
    group.add(planter);

    if (style === 'cypress') {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 1.5 * scale, 8), trunkMat);
      trunk.position.y = 0.75 * scale;
      group.add(trunk);

      const cone1 = new THREE.Mesh(new THREE.ConeGeometry(0.95 * scale, 4.2 * scale, 12), leafMat1);
      cone1.position.y = 3.1 * scale;
      cone1.castShadow = true;
      group.add(cone1);

      const cone2 = new THREE.Mesh(new THREE.ConeGeometry(0.72 * scale, 3.2 * scale, 12), leafMat2);
      cone2.position.y = 4.2 * scale;
      cone2.castShadow = true;
      group.add(cone2);
    } else {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.32 * scale, 2.5 * scale, 10), trunkMat);
      trunk.position.y = 1.25 * scale;
      trunk.castShadow = true;
      group.add(trunk);

      const blobs = [
        [0, 3.2, 0, 1.65],
        [0.85, 3.6, 0.4, 1.25],
        [-0.75, 3.4, -0.4, 1.3],
        [0.2, 4.2, -0.2, 1.15]
      ];
      blobs.forEach(([bx, by, bz, br], idx) => {
        const sp = new THREE.Mesh(
          new THREE.DodecahedronGeometry(br * scale, 1),
          idx % 2 === 0 ? leafMat1 : leafMat2
        );
        sp.position.set(bx * scale, by * scale, bz * scale);
        sp.castShadow = true;
        group.add(sp);
      });
    }

    group.position.set(x, 0, z);
    return group;
  }

  // ==========================================================================
  // 4. ARQUITECTURA DE CASA MODERNA CON MUCHO VIDRIO + INTERIOR AMUEBLADO
  // ==========================================================================

  /**
   * Crea un Muro Cortina de Cristal Piso-Techo (Curtain Wall) con montantes de aluminio
   * anodizado negro mate y opción de puerta corrediza abierta.
   */
  createGlassCurtainWall(width, height, depthAxis = 'x', glassMat, frameMat, hasSlidingOpen = false) {
    const wall = new THREE.Group();
    const frameThick = 0.065;

    // Marco perimetral superior e inferior
    const topRail = new THREE.Mesh(
      new THREE.BoxGeometry(depthAxis === 'x' ? width : frameThick, frameThick, depthAxis === 'z' ? width : frameThick),
      frameMat
    );
    topRail.position.y = height / 2 - frameThick / 2;
    wall.add(topRail);

    const bottomRail = topRail.clone();
    bottomRail.position.y = -height / 2 + frameThick / 2;
    wall.add(bottomRail);

    // Subdividir en módulos de vidrio de ~1.9m de ancho
    const numPanels = Math.max(2, Math.round(width / 1.9));
    const panelSpan = width / numPanels;

    for (let i = 0; i <= numPanels; i++) {
      const offset = -width / 2 + i * panelSpan;
      const mullion = new THREE.Mesh(
        new THREE.BoxGeometry(frameThick, height, frameThick),
        frameMat
      );
      if (depthAxis === 'x') mullion.position.set(offset, 0, 0);
      else mullion.position.set(0, 0, offset);
      mullion.castShadow = true;
      wall.add(mullion);

      if (i < numPanels) {
        const centerOffset = offset + panelSpan / 2;
        // Si tiene puerta corrediza abierta, dejamos el panel central desplazado para paso libre
        const isOpenDoor = hasSlidingOpen && i === Math.floor(numPanels / 2);
        const glassPane = new THREE.Mesh(
          new THREE.BoxGeometry(
            depthAxis === 'x' ? panelSpan - 0.04 : 0.028,
            height - 0.1,
            depthAxis === 'z' ? panelSpan - 0.04 : 0.028
          ),
          glassMat
        );

        if (depthAxis === 'x') {
          glassPane.position.set(isOpenDoor ? centerOffset + panelSpan * 0.78 : centerOffset, 0, isOpenDoor ? 0.04 : 0);
        } else {
          glassPane.position.set(isOpenDoor ? 0.04 : 0, 0, isOpenDoor ? centerOffset + panelSpan * 0.78 : centerOffset);
        }
        wall.add(glassPane);
      }
    }

    return wall;
  }

  /**
   * Construye el mobiliario interior moderno que se ve a través de las fachadas de vidrio:
   * Sala en L, alfombra, mesa de centro, muro chimenea con fuego, cocina con isla de mármol,
   * lámparas colgantes y escalera flotante en madera y cristal.
   */
  buildModernInterior(baseY = 0.36, hasSecondFloor = false) {
    const interior = new THREE.Group();

    const fabricMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.85 });
    const accentCushionMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.25 });
    const marbleMat = new THREE.MeshStandardMaterial({ map: this.textures.stone, roughness: 0.18, metalness: 0.05 });
    const woodMat = new THREE.MeshStandardMaterial({ map: this.textures.wood, roughness: 0.45 });

    // 1. SALA DE ESTAR (LIVING ROOM) FRENTE AL VENTANAL DE LA PISCINA
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.02, 3.4),
      new THREE.MeshStandardMaterial({ color: 0xd6d3c9, roughness: 0.95 })
    );
    rug.position.set(-2.6, baseY + 0.01, -2.6);
    rug.receiveShadow = true;
    interior.add(rug);

    // Sofá Modular en L
    const sofaBase1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 1.05), fabricMat);
    sofaBase1.position.set(-2.6, baseY + 0.21, -3.6);
    sofaBase1.castShadow = true;
    interior.add(sofaBase1);

    const sofaBack1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.48, 0.22), fabricMat);
    sofaBack1.position.set(-2.6, baseY + 0.55, -4.02);
    interior.add(sofaBack1);

    const sofaChaise = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 2.2), fabricMat);
    sofaChaise.position.set(-3.7, baseY + 0.21, -2.5);
    sofaChaise.castShadow = true;
    interior.add(sofaChaise);

    // Cojines decorativos
    [-3.4, -2.6, -1.8].forEach((cx) => {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.15), accentCushionMat);
      pillow.position.set(cx, baseY + 0.55, -3.75);
      pillow.rotation.x = -0.15;
      interior.add(pillow);
    });

    // Mesa de Centro en Madera y Cristal
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.95), woodMat);
    coffeeTable.position.set(-2.3, baseY + 0.16, -2.2);
    coffeeTable.castShadow = true;
    interior.add(coffeeTable);

    // Muro de Chimenea Lineal Moderna y TV
    const fireplaceWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 3.6, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    fireplaceWall.position.set(-6.8, baseY + 1.8, -2.6);
    fireplaceWall.castShadow = true;
    interior.add(fireplaceWall);

    // Fuego lineal emisivo
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a });
    const flameStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 1.7), flameMat);
    flameStrip.position.set(-6.54, baseY + 0.65, -2.6);
    interior.add(flameStrip);
    this.flameMeshes.push(flameStrip);

    // 2. COCINA ABIERTA CON ISLA EN MÁRMOL Y LÁMPARAS COLGANTES
    const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.94, 1.15), marbleMat);
    kitchenIsland.position.set(1.6, baseY + 0.47, -3.4);
    kitchenIsland.castShadow = true;
    interior.add(kitchenIsland);

    // Taburetes de la isla
    [0.7, 1.6, 2.5].forEach((sx) => {
      const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.68, 8), darkMetalMat);
      stoolLeg.position.set(sx, baseY + 0.34, -2.55);
      interior.add(stoolLeg);

      const stoolSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), woodMat);
      stoolSeat.position.set(sx, baseY + 0.7, -2.55);
      interior.add(stoolSeat);
    });

    // 3 Lámparas colgantes de cristal dorado sobre la isla
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe4b5 });
    [0.8, 1.6, 2.4].forEach((lx) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2, 6), darkMetalMat);
      cord.position.set(lx, baseY + 3.1, -3.4);
      interior.add(cord);

      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), bulbMat);
      globe.position.set(lx, baseY + 2.45, -3.4);
      interior.add(globe);
      this.emissiveMeshes.push(globe);
    });

    // 3. ESCALERA FLOTANTE DE MADERA Y BARANDA DE CRISTAL (Si tiene 2 pisos o doble altura)
    if (hasSecondFloor) {
      const numSteps = 12;
      for (let s = 0; s < numSteps; s++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.32), woodMat);
        step.position.set(-5.6, baseY + 0.3 + s * 0.28, -5.8 + s * 0.34);
        step.castShadow = true;
        interior.add(step);
      }

      // Suite en el Segundo Piso (Cama King vista a través del cristal superior)
      const secondFloorY = baseY + 3.65;
      const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 2.4), woodMat);
      bedFrame.position.set(-2.4, secondFloorY + 0.22, -4.2);
      interior.add(bedFrame);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.32, 2.2), fabricMat);
      mattress.position.set(-2.4, secondFloorY + 0.5, -4.2);
      interior.add(mattress);

      const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.35, 0.18), woodMat);
      headboard.position.set(-2.4, secondFloorY + 0.85, -5.35);
      interior.add(headboard);
    }

    return interior;
  }

  /**
   * Reconstruye la Casa Moderna de Cristal y las amenidades dentro del lote de 20m x 30m
   */
  rebuild3DHouse() {
    if (!this.houseGroup) return;
    this.houseGroup.clear();
    this.nightLights = [];
    this.emissiveMeshes = [];
    this.flameMeshes = [];
    this.poolWaterMesh = null;
    this.reflectingPoolMesh = null;

    if (this.config.model === 'solo_terreno_600m2') {
      const sign = this.makeTextLabelSprite('LOTE 600.00 m² (20m × 30m) LISTO PARA CONSTRUIR', '#064e3b', '#6ee7b7');
      sign.position.set(0, 2.8, 0);
      sign.scale.set(9.5, 2.3, 1);
      this.houseGroup.add(sign);
      return;
    }

    // MATERIALES PBR ARQUITECTÓNICOS
    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.facadeColor),
      map: this.textures.stone,
      bumpMap: this.textures.stone,
      bumpScale: 0.015,
      roughness: 0.55,
      metalness: 0.05
    });

    const roofSlabMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.config.roofColor),
      roughness: 0.38,
      metalness: 0.25
    });

    const woodCeilingMat = new THREE.MeshStandardMaterial({
      map: this.textures.wood,
      bumpMap: this.textures.wood,
      bumpScale: 0.02,
      roughness: 0.42
    });

    const blackFrameMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.22,
      metalness: 0.85
    });

    // MATERIAL ESTRELLA: CRISTAL ARQUITECTÓNICO FOTORREALISTA
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(this.config.glassTint || '#cceeff'),
      transparent: true,
      opacity: 0.36,
      transmission: 0.72,
      roughness: 0.03,
      metalness: 0.12,
      ior: 1.52,
      reflectivity: 0.96,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.3,
      side: THREE.DoubleSide
    });

    const floorMarbleMat = new THREE.MeshStandardMaterial({
      map: this.textures.stone,
      roughness: 0.2,
      metalness: 0.08
    });

    const ledStripMat = new THREE.MeshBasicMaterial({ color: 0xffd280 });

    // ========================================================================
    // BASAMENTO FLOTANTE, ESPEJO DE AGUA Y PELDAÑOS ILUMINADOS
    // ========================================================================
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.36, 11.4), floorMarbleMat);
    plinth.position.set(-1.0, 0.18, -3.2);
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.houseGroup.add(plinth);

    // Tira LED cálida perimetral bajo la plataforma flotante
    const plinthLed = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.05, 11.2), ledStripMat);
    plinthLed.position.set(-1.0, 0.03, -3.2);
    this.houseGroup.add(plinthLed);
    this.emissiveMeshes.push(plinthLed);

    // Peldaños flotantes de entrada con espejo de agua
    for (let st = 0; st < 4; st++) {
      const stepSlab = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.85), floorMarbleMat);
      stepSlab.position.set(-1.2, 0.08 + st * 0.06, 6.2 - st * 1.15);
      stepSlab.castShadow = true;
      stepSlab.receiveShadow = true;
      this.houseGroup.add(stepSlab);

      const stepLed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.75), ledStripMat);
      stepLed.position.set(-1.2, 0.03 + st * 0.06, 6.2 - st * 1.15);
      this.houseGroup.add(stepLed);
    }

    // ========================================================================
    // CONSTRUCCIÓN DE LOS PROTOTIPOS DE CASA MODERNA DE CRISTAL
    // ========================================================================
    const isTwoFloors = this.config.model === 'residencia_imperial_2p';
    const isDoubleHeightLoft = this.config.model === 'ecolodge_minimalista';

    // Insertar todo el mobiliario interior visible a través del vidrio
    const interiorFurnishings = this.buildModernInterior(0.36, isTwoFloors || isDoubleHeightLoft);
    this.houseGroup.add(interiorFurnishings);

    // Muro estructural posterior y columna en L (solo el 20% es muro sólido, el 80% es vidrio)
    const h1 = isDoubleHeightLoft ? 4.8 : 3.8;
    const backCoreWall = new THREE.Mesh(new THREE.BoxGeometry(13.2, h1, 0.45), wallMat);
    backCoreWall.position.set(-1.0, 0.36 + h1 / 2, -7.8);
    backCoreWall.castShadow = true;
    backCoreWall.receiveShadow = true;
    this.houseGroup.add(backCoreWall);

    // Columna arquitectónica revestida en madera teca en el frente derecho
    const featurePillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, h1, 1.1), woodCeilingMat);
    featurePillar.position.set(5.1, 0.36 + h1 / 2, 1.2);
    featurePillar.castShadow = true;
    this.houseGroup.add(featurePillar);

    // GRAN MURO CORTINA DE CRISTAL FRONTAL (12.4m de largo x altura piso-techo)
    const frontCurtainWall = this.createGlassCurtainWall(12.2, h1, 'x', glassMat, blackFrameMat, true);
    frontCurtainWall.position.set(-1.2, 0.36 + h1 / 2, 1.2);
    this.houseGroup.add(frontCurtainWall);

    // MURO CORTINA LATERAL DERECHO (Hacia la piscina y pérgola)
    const rightCurtainWall = this.createGlassCurtainWall(9.0, h1, 'z', glassMat, blackFrameMat, true);
    rightCurtainWall.position.set(4.9, 0.36 + h1 / 2, -3.3);
    this.houseGroup.add(rightCurtainWall);

    // MURO CORTINA LATERAL IZQUIERDO
    const leftCurtainWall = this.createGlassCurtainWall(9.0, h1, 'z', glassMat, blackFrameMat, false);
    leftCurtainWall.position.set(-7.3, 0.36 + h1 / 2, -3.3);
    this.houseGroup.add(leftCurtainWall);

    // Losa de entrepiso / cubierta en gran voladizo con plafón inferior en madera teca
    const slab1Y = 0.36 + h1;
    const mainRoofSlab = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.38, 11.8), roofSlabMat);
    mainRoofSlab.position.set(-1.0, slab1Y + 0.19, -3.0);
    mainRoofSlab.castShadow = true;
    mainRoofSlab.receiveShadow = true;
    this.houseGroup.add(mainRoofSlab);

    const woodSoffit1 = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.06, 11.4), woodCeilingMat);
    woodSoffit1.position.set(-1.0, slab1Y - 0.02, -3.0);
    this.houseGroup.add(woodSoffit1);

    // Spots LED empotrados en el plafón de madera
    for (let lx = -6.5; lx <= 4.5; lx += 2.75) {
      for (let lz = -6.5; lz <= 1.5; lz += 2.6) {
        const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), ledStripMat);
        spot.position.set(lx, slab1Y - 0.05, lz);
        this.houseGroup.add(spot);
        this.emissiveMeshes.push(spot);
      }
    }

    // SI ES EL MODELO DE 2 PISOS (RESIDENCIA CRYSTAL IMPERIAL 2 PISOS)
    if (isTwoFloors) {
      const h2 = 3.4;
      const base2Y = slab1Y + 0.38;

      // Muro posterior 2do nivel
      const backWall2 = new THREE.Mesh(new THREE.BoxGeometry(10.2, h2, 0.42), wallMat);
      backWall2.position.set(-1.8, base2Y + h2 / 2, -7.6);
      backWall2.castShadow = true;
      this.houseGroup.add(backWall2);

      // Muros Cortina de Cristal Piso-Techo en el Segundo Piso (Esquina de vidrio sin columnas)
      const frontGlass2 = this.createGlassCurtainWall(9.8, h2, 'x', glassMat, blackFrameMat, true);
      frontGlass2.position.set(-1.8, base2Y + h2 / 2, -0.8);
      this.houseGroup.add(frontGlass2);

      const rightGlass2 = this.createGlassCurtainWall(6.8, h2, 'z', glassMat, blackFrameMat, false);
      rightGlass2.position.set(3.1, base2Y + h2 / 2, -4.2);
      this.houseGroup.add(rightGlass2);

      const leftGlass2 = this.createGlassCurtainWall(6.8, h2, 'z', glassMat, blackFrameMat, false);
      leftGlass2.position.set(-6.7, base2Y + h2 / 2, -4.2);
      this.houseGroup.add(leftGlass2);

      // Barandales de vidrio templado sin marco en la terraza mirador del 2do piso
      const frontBalconyGlass = new THREE.Mesh(new THREE.BoxGeometry(14.8, 1.1, 0.04), glassMat);
      frontBalconyGlass.position.set(-1.0, base2Y + 0.55, 2.65);
      this.houseGroup.add(frontBalconyGlass);

      const rightBalconyGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.1, 5.2), glassMat);
      rightBalconyGlass.position.set(6.4, base2Y + 0.55, 0.0);
      this.houseGroup.add(rightBalconyGlass);

      // Losa Superior de Cubierta 2do Nivel en Voladizo
      const topRoofY = base2Y + h2;
      const topSlab = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.42, 8.8), roofSlabMat);
      topSlab.position.set(-1.8, topRoofY + 0.21, -4.0);
      topSlab.castShadow = true;
      this.houseGroup.add(topSlab);

      const topSoffit = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.06, 8.4), woodCeilingMat);
      topSoffit.position.set(-1.8, topRoofY - 0.02, -4.0);
      this.houseGroup.add(topSoffit);

      // Luz interior 2do piso
      const upperLight = new THREE.PointLight(0xffd280, 0.9, 18);
      upperLight.position.set(-2.0, base2Y + 2.2, -3.8);
      this.houseGroup.add(upperLight);
      this.nightLights.push(upperLight);
    }

    // Celosías verticales de madera arquitectónica (Brise-soleil) en fachada occidental
    for (let b = 0; b < 7; b++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.12, h1, 0.38), woodCeilingMat);
      slat.position.set(-7.35, 0.36 + h1 / 2, -0.5 + b * 0.28);
      slat.castShadow = true;
      this.houseGroup.add(slat);
    }

    // Luces cálidas interiores principales (visibles a través del vidrio día y noche)
    const livingLight = new THREE.PointLight(0xffcf87, 1.1, 22);
    livingLight.position.set(-2.5, 2.8, -2.5);
    this.houseGroup.add(livingLight);
    this.nightLights.push(livingLight);

    const kitchenLight = new THREE.PointLight(0xffe0b2, 1.0, 18);
    kitchenLight.position.set(2.0, 2.8, -3.2);
    this.houseGroup.add(kitchenLight);
    this.nightLights.push(kitchenLight);

    // ========================================================================
    // AMENIDADES EXTERIORES EN LOS 600 m² (PISCINA INFINITA, LOUNGE, SUV)
    // ========================================================================

    // 1. PISCINA INFINITA CON BORDE DE CRISTAL, TUMBONAS Y ZONA FIRE-PIT
    if (this.config.hasPool) {
      const poolGroup = new THREE.Group();

      // Deck de madera teca
      const deck = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.24, 7.2), woodCeilingMat);
      deck.position.set(3.4, 0.12, 6.2);
      deck.receiveShadow = true;
      poolGroup.add(deck);

      // Vaso de la piscina en piedra turquesa
      const poolBasin = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 0.32, 4.4),
        new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.25 })
      );
      poolBasin.position.set(3.8, 0.16, 6.4);
      poolGroup.add(poolBasin);

      // Borde delantero de cristal en la piscina infinita
      const infinityGlassEdge = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.42, 0.08), glassMat);
      infinityGlassEdge.position.set(3.8, 0.28, 8.6);
      poolGroup.add(infinityGlassEdge);

      // Superficie de agua con reflejos reales y ondas animadas
      const waterGeo = new THREE.PlaneGeometry(7.0, 4.2, 24, 24);
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        bumpMap: this.textures.waterBump,
        bumpScale: 0.04,
        roughness: 0.04,
        metalness: 0.1,
        transmission: 0.65,
        transparent: true,
        opacity: 0.88,
        ior: 1.333,
        reflectivity: 0.92
      });
      this.poolWaterMesh = new THREE.Mesh(waterGeo, waterMat);
      this.poolWaterMesh.rotation.x = -Math.PI / 2;
      this.poolWaterMesh.position.set(3.8, 0.35, 6.4);
      poolGroup.add(this.poolWaterMesh);

      // 2 Sillas Asoleadoras (Sun Loungers) de diseño + Sombrilla Cantiléver
      [1.2, 2.5].forEach((lx) => {
        const loungerBase = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 2.0), woodCeilingMat);
        loungerBase.position.set(lx, 0.33, 3.4);
        loungerBase.castShadow = true;
        poolGroup.add(loungerBase);

        const cushion = new THREE.Mesh(
          new THREE.BoxGeometry(0.78, 0.08, 1.9),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })
        );
        cushion.position.set(lx, 0.45, 3.4);
        poolGroup.add(cushion);
      });

      // Zona Fire-Pit Exterior (Fogatero con fuego cálido)
      const firePitTable = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.85, 0.42, 24), floorMarbleMat);
      firePitTable.position.set(7.2, 0.38, 3.4);
      firePitTable.castShadow = true;
      poolGroup.add(firePitTable);

      const fireOrb = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.55, 12),
        new THREE.MeshBasicMaterial({ color: 0xff7b00 })
      );
      fireOrb.position.set(7.2, 0.72, 3.4);
      poolGroup.add(fireOrb);
      this.flameMeshes.push(fireOrb);

      const poolSubLight = new THREE.PointLight(0x38bdf8, 0.8, 14);
      poolSubLight.position.set(3.8, 0.9, 6.4);
      poolGroup.add(poolSubLight);
      this.nightLights.push(poolSubLight);

      this.houseGroup.add(poolGroup);
    }

    // 2. PÉRGOLA BIOCLIMÁTICA EN ACERO NEGRO, MADERA Y CRISTAL TEMPLADO
    if (this.config.hasPergola) {
      const pergolaGroup = new THREE.Group();
      const posts = [
        [5.0, -7.2],
        [8.4, -7.2],
        [5.0, -1.8],
        [8.4, -1.8]
      ];
      posts.forEach(([px, pz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), blackFrameMat);
        post.position.set(px, 1.7, pz);
        post.castShadow = true;
        pergolaGroup.add(post);
      });

      // Cubierta de cristal sobre la pérgola + lamas de madera
      const pergolaGlassRoof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 5.6), glassMat);
      pergolaGlassRoof.position.set(6.7, 3.45, -4.5);
      pergolaGroup.add(pergolaGlassRoof);

      for (let z = -7.1; z <= -1.9; z += 0.48) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.14, 0.12), woodCeilingMat);
        louver.position.set(6.7, 3.35, z);
        louver.castShadow = true;
        pergolaGroup.add(louver);
      }

      // Mesa BBQ / Comedor exterior bajo la pérgola
      const outdoorTable = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.76, 2.6), woodCeilingMat);
      outdoorTable.position.set(6.7, 0.42, -4.5);
      outdoorTable.castShadow = true;
      pergolaGroup.add(outdoorTable);

      this.houseGroup.add(pergolaGroup);
    }

    // 3. GARAJE MODERNO Y VEHÍCULO SUV COUPÉ DETALLADO CON PINTURA CLEARCOAT
    if (this.config.hasGarage) {
      const driveway = new THREE.Mesh(
        new THREE.BoxGeometry(5.0, 0.12, 10.6),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 })
      );
      driveway.position.set(-5.4, 0.06, 9.2);
      driveway.receiveShadow = true;
      this.houseGroup.add(driveway);

      const suv = this.buildDetailedLuxurySUV();
      suv.position.set(-5.4, 0.12, 8.2);
      this.houseGroup.add(suv);
    }

    // 4. PANELES SOLARES FOTOVOLTAICOS CRISTALINOS
    if (this.config.hasSolarPanels) {
      const solarY = isTwoFloors ? 7.82 : (isDoubleHeightLoft ? 5.6 : 4.6);
      const solarMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        metalness: 0.85,
        roughness: 0.12,
        clearcoat: 1.0,
        reflectivity: 0.9
      });
      for (let i = -2; i <= 1; i++) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.06, 2.6), solarMat);
        panel.position.set(-3.2 + i * 1.95, solarY, -4.2);
        panel.rotation.x = 0.14;
        this.houseGroup.add(panel);
      }
    }

    this.updateSunPosition(this.config.sunHour);
  }

  buildDetailedLuxurySUV() {
    const car = new THREE.Group();

    const paintMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      metalness: 0.75,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05
    });

    const carGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.2,
      transmission: 0.4,
      transparent: true,
      opacity: 0.85,
      clearcoat: 1.0
    });

    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });

    // Chasis inferior
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.72, 4.65), paintMat);
    lowerBody.position.y = 0.62;
    lowerBody.castShadow = true;
    car.add(lowerBody);

    // Cabina acristalada aerodinámica
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.62, 2.55), carGlassMat);
    cabin.position.set(0, 1.24, -0.2);
    cabin.castShadow = true;
    car.add(cabin);

    // Ruedas y rines deportivos
    const wheelCoords = [
      [-1.02, 0.4, 1.45],
      [1.02, 0.4, 1.45],
      [-1.02, 0.4, -1.45],
      [1.02, 0.4, -1.45]
    ];
    wheelCoords.forEach(([wx, wy, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 20), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, wy, wz);
      car.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 12), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, wy, wz);
      car.add(rim);
    });

    // Barra de faros LED delanteros y traseros
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.08, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe })
    );
    headlight.position.set(0, 0.78, 2.33);
    car.add(headlight);

    const taillight = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.08, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e })
    );
    taillight.position.set(0, 0.82, -2.33);
    car.add(taillight);

    return car;
  }

  // ==========================================================================
  // 5. COTAS 20x30m, SIMULADOR SOLAR Y CÁMARAS INTERACTIVAS
  // ==========================================================================
  makeTextLabelSprite(text, bgColor = '#0b1914', textColor = '#f0a854') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 6;
    ctx.fillRect(10, 10, 492, 108);
    ctx.strokeRect(10, 10, 492, 108);

    ctx.font = 'bold 34px "JetBrains Mono", monospace';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6.5, 1.65, 1);
    return sprite;
  }

  buildDimensionMarkers20x30() {
    if (!this.dimensionsGroup) return;
    this.dimensionsGroup.clear();

    const lineMat = new THREE.LineBasicMaterial({ color: 0xf0a854 });

    // Frente 20.00m
    const frontPts = [new THREE.Vector3(-10, 0.3, 15.8), new THREE.Vector3(10, 0.3, 15.8)];
    this.dimensionsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(frontPts), lineMat));

    const lblFront = this.makeTextLabelSprite('FRENTE: 20.00 m');
    lblFront.position.set(0, 1.45, 15.8);
    this.dimensionsGroup.add(lblFront);

    // Fondo 30.00m
    const depthPts = [new THREE.Vector3(11.0, 0.3, -15), new THREE.Vector3(11.0, 0.3, 15)];
    this.dimensionsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(depthPts), lineMat));

    const lblDepth = this.makeTextLabelSprite('FONDO: 30.00 m (600 m²)');
    lblDepth.position.set(11.4, 1.65, 0);
    this.dimensionsGroup.add(lblDepth);
  }

  updateSunPosition(hour) {
    const lbl = document.getElementById('lbl-sun-hour');
    if (lbl) {
      const h = Math.floor(hour);
      const m = hour % 1 === 0.5 ? '30' : '00';
      const suffix = h >= 12 ? (h >= 19 ? 'Noche' : 'PM') : 'AM';
      lbl.textContent = `${String(h).padStart(2, '0')}:${m} ${suffix}`;
    }

    if (!this.sunLight || !this.scene) return;

    this.updateEnvironmentMap(hour);

    const normalized = (hour - 6) / 14;
    const angle = normalized * Math.PI;
    const radius = 45;

    const sunX = Math.cos(angle) * radius;
    const sunY = Math.max(3, Math.sin(angle) * radius);
    const sunZ = 22;

    this.sunLight.position.set(sunX, sunY, sunZ);

    const isNight = hour >= 18.8 || hour <= 6.2;
    const isGoldenHour = (hour >= 16.5 && hour < 18.8) || (hour > 6.2 && hour <= 8.0);

    if (isNight) {
      this.scene.background.setHex(0x050d12);
      this.scene.fog.color.setHex(0x050d12);
      if (this.skyDome) this.skyDome.material.color.setHex(0x050d12);
      this.sunLight.intensity = 0.15;
      this.ambientLight.intensity = 0.28;
      this.nightLights.forEach((l) => {
        l.intensity = 2.1;
      });
    } else if (isGoldenHour) {
      this.scene.background.setHex(0x1b262c);
      this.scene.fog.color.setHex(0x1b262c);
      if (this.skyDome) this.skyDome.material.color.setHex(0x1b262c);
      this.sunLight.color.setHex(0xfdba74);
      this.sunLight.intensity = 1.25;
      this.ambientLight.intensity = 0.45;
      this.nightLights.forEach((l) => {
        l.intensity = 1.45;
      });
    } else {
      this.scene.background.setHex(0x132e25);
      this.scene.fog.color.setHex(0x132e25);
      if (this.skyDome) this.skyDome.material.color.setHex(0x132e25);
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 1.5;
      this.ambientLight.intensity = 0.55;
      this.nightLights.forEach((l) => {
        l.intensity = 0.65;
      });
    }
  }

  moveCameraToPreset(preset) {
    if (!this.camera || !this.controls) return;
    const targets = {
      perspective: { pos: [22, 14, 28], target: [0, 2.5, -1] },
      front: { pos: [-1, 4.2, 24], target: [-1, 2.6, -3] },
      interior: { pos: [1.5, 2.4, 6.2], target: [-2.0, 2.0, -3.5] },
      pool: { pos: [13.5, 4.2, 13.5], target: [1.5, 1.8, 2.5] },
      top: { pos: [0, 42, 0.1], target: [0, 0, 0] }
    };
    const cfg = targets[preset] || targets.perspective;

    if (typeof anime !== 'undefined') {
      anime({
        targets: this.camera.position,
        x: cfg.pos[0],
        y: cfg.pos[1],
        z: cfg.pos[2],
        duration: 900,
        easing: 'easeOutCubic',
        update: () => {
          this.controls.target.set(cfg.target[0], cfg.target[1], cfg.target[2]);
          this.controls.update();
        }
      });
    } else {
      this.camera.position.set(...cfg.pos);
      this.controls.target.set(...cfg.target);
      this.controls.update();
    }
  }

  calculateHouseCost() {
    const basePrices = {
      villa_terranova_1p: 285000000,
      residencia_imperial_2p: 420000000,
      ecolodge_minimalista: 340000000,
      solo_terreno_600m2: 0
    };
    let cost = basePrices[this.config.model] || 0;
    if (cost > 0) {
      if (this.config.hasPool) cost += 45000000;
      if (this.config.hasPergola) cost += 18000000;
      if (this.config.hasSolarPanels) cost += 22000000;
    }
    return cost;
  }

  updateBudgetHUD() {
    const fmt = (n) => '$' + Math.round(Number(n || 0)).toLocaleString('es-CO');
    const lotPrice = this.currentLot ? Number(this.currentLot.precio_total) : 150000000;
    const housePrice = this.calculateHouseCost();
    const total = lotPrice + housePrice;

    const modelNames = {
      villa_terranova_1p: 'Glass Pavilion 1 Piso (85% Cristal)',
      residencia_imperial_2p: 'Residencia Crystal Imperial 2 Pisos',
      ecolodge_minimalista: 'Sky-Loft Doble Altura en Cristal',
      solo_terreno_600m2: 'Solo Terreno Acotado (600 m²)'
    };

    const titleEl = document.getElementById('studio-3d-lot-title');
    const summaryEl = document.getElementById('studio-3d-budget-summary');
    const elLot = document.getElementById('calc-3d-lot-price');
    const elHouse = document.getElementById('calc-3d-house-price');
    const elTotal = document.getElementById('calc-3d-total-price');

    if (titleEl && this.currentLot) {
      titleEl.textContent = `Lote ${this.currentLot.codigo} (${this.currentLot.manzana}) · ${modelNames[this.config.model]}`;
    }
    if (summaryEl) {
      summaryEl.textContent = `Lote 600m²: ${fmt(lotPrice)} + Casa Cristal 3D: ${fmt(housePrice)} = Total: ${fmt(total)}`;
    }
    if (elLot) elLot.textContent = fmt(lotPrice);
    if (elHouse) elHouse.textContent = fmt(housePrice);
    if (elTotal) elTotal.textContent = fmt(total);
  }

  async saveCurrent3DConfigToMySQL() {
    if (!this.currentLot) return;
    try {
      const builtAreas = {
        villa_terranova_1p: 145,
        residencia_imperial_2p: 240,
        ecolodge_minimalista: 185,
        solo_terreno_600m2: 0
      };
      const updatedRenderConfig = {
        ...this.config,
        builtAreaM2: builtAreas[this.config.model] || 145,
        estimatedHouseCost: this.calculateHouseCost()
      };

      const res = await fetch(`/api/lotes/${this.currentLot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ render_config: updatedRenderConfig })
      });
      const data = await res.json();
      if (data.ok && window.app) {
        window.app.showToast(`Diseño Casa de Cristal 3D guardado en MySQL para el lote ${this.currentLot.codigo}.`);
        await window.app.refreshAllData();
      }
    } catch (err) {
      console.error('Error guardando configuración 3D:', err);
    }
  }

  captureScreenshot() {
    if (!this.renderer) return;
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    const code = this.currentLot ? this.currentLot.codigo : 'Lote-600m2';
    link.download = `Render3D-CasaCristal-${code}.png`;
    link.href = dataUrl;
    link.click();
    if (window.app) {
      window.app.showToast(`Captura PNG descargada: Render3D-CasaCristal-${code}.png`);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const elapsed = this.clock.getElapsedTime();

    // Animar ondas de la piscina y su textura de relieve
    if (this.poolWaterMesh) {
      this.poolWaterMesh.position.y = 0.34 + Math.sin(elapsed * 2.2) * 0.012;
      if (this.textures.waterBump) {
        this.textures.waterBump.offset.x = (elapsed * 0.03) % 1;
        this.textures.waterBump.offset.y = (elapsed * 0.02) % 1;
      }
    }

    // Animar sutilmente las llamas de la chimenea interior y del Fire-Pit exterior
    if (this.flameMeshes.length > 0) {
      const flicker = 0.92 + Math.sin(elapsed * 14) * 0.08;
      this.flameMeshes.forEach((f) => {
        f.scale.y = flicker;
      });
    }

    if (this.controls) {
      this.controls.update();
    }
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

window.house3DStudio = new House3DStudio();
