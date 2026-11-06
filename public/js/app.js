/**
 * PRADOS DE TERRANOVA — Controlador Principal SPA, Auth Login, 38 Lotes & Contabilidad MySQL
 */

class TerranovaApp {
  constructor() {
    this.config = null;
    this.user = null;
    this.lotes = [];
    this.dashboard = null;
    this.clientes = [];
    this.ventas = [];
    this.abonos = [];
    this.contabilidad = { movimientos: [], porCategoria: [] };
    this.currentView = 'view-dashboard';
  }

  async init() {
    this.bindGlobalEvents();
    this.setDefaultFormDates();

    try {
      const [cfgRes, pubRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/public/resumen')
      ]);
      this.config = await cfgRes.json();
      const pubData = await pubRes.json();
      this.lotes = pubData.lotes || [];

      if (window.landingAnime) {
        window.landingAnime.init(this.lotes, pubData.stats);
      }

      // Verificar si hay sesión guardada
      const savedUser = localStorage.getItem('terranova_user');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        this.updateUserHeader();
        const btnRet = document.getElementById('btn-return-dashboard');
        if (btnRet) btnRet.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error iniciando aplicación:', err);
    }
  }

  setDefaultFormDates() {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonthDate = new Date();
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
    const nextMonth = nextMonthDate.toISOString().slice(0, 10);

    const abonoFecha = document.getElementById('abono-fecha');
    const abonoProx = document.getElementById('abono-proximo-pago');
    const accFecha = document.getElementById('acc-fecha');
    const saleProx = document.getElementById('sale-proximo-pago');

    if (abonoFecha) abonoFecha.value = today;
    if (abonoProx) abonoProx.value = nextMonth;
    if (accFecha) accFecha.value = today;
    if (saleProx) saleProx.value = nextMonth;
  }

  fmtMoney(val) {
    return '$' + Math.round(Number(val || 0)).toLocaleString('es-CO');
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<strong>✦ Prados de Terranova</strong><div style="margin-top:0.2rem;">${message}</div>`;
    container.appendChild(toast);

    if (typeof anime !== 'undefined') {
      anime({
        targets: toast,
        translateX: [60, 0],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutExpo'
      });
    }

    setTimeout(() => {
      toast.remove();
    }, 4200);
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  }

  bindGlobalEvents() {
    // Botones Login
    const btnOpenLogin = document.getElementById('btn-open-login');
    const btnCloseLogin = document.getElementById('btn-close-login');
    const btnHero3D = document.getElementById('btn-hero-login-3d');
    const btnReturnDash = document.getElementById('btn-return-dashboard');

    if (btnOpenLogin) {
      btnOpenLogin.addEventListener('click', () => {
        this.openModal('login-modal-backdrop');
        if (window.landingAnime) window.landingAnime.animateLoginOpen();
      });
    }

    if (btnHero3D) {
      btnHero3D.addEventListener('click', () => {
        if (this.user) {
          this.enterAdminWorkspace('view-studio-3d');
        } else {
          this.openModal('login-modal-backdrop');
          if (window.landingAnime) window.landingAnime.animateLoginOpen();
        }
      });
    }

    if (btnReturnDash) {
      btnReturnDash.addEventListener('click', () => {
        this.enterAdminWorkspace('view-dashboard');
      });
    }

    if (btnCloseLogin) {
      btnCloseLogin.addEventListener('click', () => this.closeModal('login-modal-backdrop'));
    }

    // Chips de credenciales demo en Login
    document.querySelectorAll('.demo-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.getElementById('login-identifier').value = chip.dataset.user;
        document.getElementById('login-password').value = chip.dataset.pass;
      });
    });

    // Submit Login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLoginSubmit(e));
    }

    // Navegación Sidebar Admin
    document.querySelectorAll('#admin-sidebar-nav .sidebar-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.switchAdminView(btn.dataset.view);
      });
    });

    // Volver a Landing o Cerrar Sesión
    const btnBackLanding = document.getElementById('btn-back-to-landing');
    if (btnBackLanding) {
      btnBackLanding.addEventListener('click', () => {
        document.getElementById('admin-workspace').classList.add('hidden');
        document.getElementById('landing-page-view').classList.remove('hidden');
      });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('terranova_user');
        this.user = null;
        document.getElementById('admin-workspace').classList.add('hidden');
        document.getElementById('landing-page-view').classList.remove('hidden');
        document.getElementById('btn-return-dashboard').classList.add('hidden');
        this.showToast('Sesión cerrada correctamente.');
      });
    }

    // Botones rápidos Topbar
    document.getElementById('btn-quick-new-sale')?.addEventListener('click', () => this.openNewSaleModal());
    document.getElementById('btn-quick-new-abono')?.addEventListener('click', () => this.openNewAbonoModal());
    document.getElementById('btn-quick-new-accounting')?.addEventListener('click', () => this.openNewAccountingModal());
    document.getElementById('btn-open-new-client')?.addEventListener('click', () => this.openModal('modal-new-client'));

    // Filtros Catálogo de 38 Lotes
    ['registry-search-input', 'registry-manzana-filter', 'registry-estado-filter'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.renderLotsRegistryTable());
        el.addEventListener('change', () => this.renderLotsRegistryTable());
      }
    });

    // Subtabs de Contabilidad
    document.querySelectorAll('.subtabs-nav .subtab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.subtabs-nav .subtab-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const target = btn.dataset.subtab;
        document.querySelectorAll('.accounting-subtab').forEach((sec) => {
          sec.classList.toggle('hidden', sec.id !== target);
        });
      });
    });

    const accTypeFilter = document.getElementById('accounting-type-filter');
    if (accTypeFilter) {
      accTypeFilter.addEventListener('change', () => this.renderAccountingLedgerTable());
    }

    // Formularios Operativos
    document.getElementById('form-new-sale')?.addEventListener('submit', (e) => this.handleNewSaleSubmit(e));
    document.getElementById('form-new-abono')?.addEventListener('submit', (e) => this.handleNewAbonoSubmit(e));
    document.getElementById('form-new-accounting')?.addEventListener('submit', (e) => this.handleNewAccountingSubmit(e));
    document.getElementById('form-new-client')?.addEventListener('submit', (e) => this.handleNewClientSubmit(e));

    // Cambio de lote o modalidad en formulario de venta recalcula valores
    const saleLoteSelect = document.getElementById('sale-lote-id');
    const saleModeloSelect = document.getElementById('sale-modelo-casa');
    const saleModalidadSelect = document.getElementById('sale-modalidad');
    if (saleLoteSelect) {
      saleLoteSelect.addEventListener('change', () => this.recalculateSaleFormDefaults());
    }
    if (saleModeloSelect) {
      saleModeloSelect.addEventListener('change', () => this.recalculateSaleFormDefaults());
    }
    if (saleModalidadSelect) {
      saleModalidadSelect.addEventListener('change', () => this.recalculateSaleFormDefaults());
    }
  }

  async handleLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value;
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error-msg');
    if (errBox) errBox.classList.add('hidden');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (errBox) {
          errBox.textContent = data.error || 'Error de autenticación';
          errBox.classList.remove('hidden');
        }
        if (window.landingAnime) window.landingAnime.animateLoginError();
        return;
      }

      this.user = data.user;
      localStorage.setItem('terranova_user', JSON.stringify(this.user));
      this.updateUserHeader();
      this.closeModal('login-modal-backdrop');
      document.getElementById('btn-return-dashboard')?.classList.remove('hidden');

      this.showToast(`Bienvenido, ${this.user.nombre_completo} (${this.user.cargo}).`);
      await this.enterAdminWorkspace(this.pendingTargetView || 'view-dashboard', this.pendingLotId);
      this.pendingTargetView = null;
      this.pendingLotId = null;
    } catch (error) {
      console.error('Error en Login:', error);
    }
  }

  updateUserHeader() {
    if (!this.user) return;
    const nameEl = document.getElementById('logged-user-name');
    const roleEl = document.getElementById('logged-user-role');
    if (nameEl) nameEl.textContent = this.user.nombre_completo;
    if (roleEl) roleEl.textContent = `${this.user.cargo} · Rol: ${this.user.rol.toUpperCase()}`;
  }

  async openLotIn3DFromLanding(lotId) {
    if (!this.user) {
      this.pendingTargetView = 'view-studio-3d';
      this.pendingLotId = lotId;
      this.openModal('login-modal-backdrop');
      if (window.landingAnime) window.landingAnime.animateLoginOpen();
      return;
    }
    await this.enterAdminWorkspace('view-studio-3d', lotId);
  }

  async openLotInMapFromLanding(lotId) {
    if (!this.user) {
      this.pendingTargetView = 'view-geospatial';
      this.pendingLotId = lotId;
      this.openModal('login-modal-backdrop');
      if (window.landingAnime) window.landingAnime.animateLoginOpen();
      return;
    }
    await this.enterAdminWorkspace('view-geospatial', lotId);
  }

  async enterAdminWorkspace(targetView = 'view-dashboard', targetLotId = null) {
    document.getElementById('landing-page-view').classList.add('hidden');
    document.getElementById('admin-workspace').classList.remove('hidden');

    await this.refreshAllData();
    this.switchAdminView(targetView);

    if (targetLotId) {
      if (targetView === 'view-studio-3d' && window.house3DStudio) {
        window.house3DStudio.loadLotIntoStudio(targetLotId);
      } else if (targetView === 'view-geospatial' && window.geospatialViewer) {
        window.geospatialViewer.selectLotOnMap(targetLotId, true);
      }
    }
  }

  switchAdminView(viewId) {
    this.currentView = viewId;
    document.querySelectorAll('#admin-sidebar-nav .sidebar-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === viewId);
    });

    document.querySelectorAll('.admin-view').forEach((sec) => {
      sec.classList.toggle('hidden', sec.id !== viewId);
    });

    const viewTitles = {
      'view-dashboard': [
        'Dashboard Ejecutivo & Balance de Loteo',
        'Control financiero y ocupación de los 38 lotes campestres de 20m × 30m (600 m²).'
      ],
      'view-geospatial': [
        'Masterplan Geoespacial Satelital (38 Lotes de 600 m²)',
        'Visualización SIG interactiva sobre imagen satelital real con estado de cartera por lote.'
      ],
      'view-studio-3d': [
        'Estudio de Render 3D Arquitectónico (Lote 20m × 30m = 600 m²)',
        'Configurador WebGL en tiempo real de prototipos de vivienda campestre, piscina, iluminación solar y presupuesto.'
      ],
      'view-lots-registry': [
        'Catálogo y Registro Detallado de los 38 Lotes (600 m²)',
        'Expediente técnico individual, linderos, matrícula inmobiliaria, propietario y pagos.'
      ],
      'view-accounting': [
        'Módulo de Contabilidad, Contratos de Venta y Recaudos de Cartera',
        'Libro diario de ingresos/egresos, recibos de abonos y control de saldos en MySQL.'
      ],
      'view-clients': [
        'Directorio de Clientes, Compradores e Inversionistas',
        'Gestión de propietarios vinculados a los 38 lotes de Prados de Terranova.'
      ]
    };

    const [t, s] = viewTitles[viewId] || viewTitles['view-dashboard'];
    document.getElementById('topbar-view-title').textContent = t;
    document.getElementById('topbar-view-subtitle').textContent = s;

    if (viewId === 'view-geospatial') {
      if (!window.geospatialViewer.map) {
        window.geospatialViewer.init(this.config, this.lotes);
      } else {
        window.geospatialViewer.invalidateSize();
      }
    } else if (viewId === 'view-studio-3d') {
      if (!window.house3DStudio.renderer) {
        window.house3DStudio.init(this.lotes);
      } else {
        setTimeout(() => window.house3DStudio.handleResize(), 100);
      }
    }
  }

  async openLotIn3DStudio(lotId) {
    this.switchAdminView('view-studio-3d');
    if (window.house3DStudio) {
      window.house3DStudio.loadLotIntoStudio(lotId);
    }
  }

  async refreshAllData() {
    try {
      const [dashRes, lotesRes, cliRes, venRes, aboRes, accRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/lotes'),
        fetch('/api/clientes'),
        fetch('/api/ventas'),
        fetch('/api/abonos'),
        fetch('/api/contabilidad')
      ]);

      this.dashboard = await dashRes.json();
      this.lotes = await lotesRes.json();
      this.clientes = await cliRes.json();
      this.ventas = await venRes.json();
      this.abonos = await aboRes.json();
      this.contabilidad = await accRes.json();

      this.renderDashboardView();
      this.renderLotsRegistryTable();
      this.renderAccountingLedgerTable();
      this.renderVentasTable();
      this.renderAbonosTable();
      this.renderClientsTable();

      if (window.geospatialViewer && window.geospatialViewer.map) {
        window.geospatialViewer.updateLots(this.lotes);
      }
      if (window.house3DStudio && window.house3DStudio.renderer) {
        window.house3DStudio.updateLotsList(this.lotes);
      }
      if (window.landingAnime) {
        window.landingAnime.updateData(this.lotes, this.dashboard.lotes);
      }
    } catch (error) {
      console.error('Error refrescando datos desde MySQL:', error);
    }
  }

  // =========================================================================
  // RENDERIZADO VISTA 1: DASHBOARD
  // =========================================================================
  renderDashboardView() {
    if (!this.dashboard) return;
    const { lotes, finanzas, porManzana, proximosCobros, ultimosMovimientos } = this.dashboard;

    const kpiGrid = document.getElementById('dashboard-kpi-grid');
    if (kpiGrid) {
      kpiGrid.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Total Loteo (20×30m = 600 m²)</div>
          <div class="kpi-value">${lotes.total} Lotes</div>
          <div class="kpi-sub">🟢 ${lotes.disponibles} Disp · 🟡 ${lotes.reservados} Res · 🔴 ${lotes.vendidos} Vend</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Valor Total Inventario (38 Lotes)</div>
          <div class="kpi-value">${this.fmtMoney(lotes.valorInventario)}</div>
          <div class="kpi-sub">Área Total: ${lotes.areaTotalM2.toLocaleString('es-CO')} m²</div>
        </div>
        <div class="kpi-card income">
          <div class="kpi-label">Total Ventas Adjudicadas</div>
          <div class="kpi-value">${this.fmtMoney(finanzas.totalVentasCerradas)}</div>
          <div class="kpi-sub">${finanzas.totalContratos} contratos activos en MySQL</div>
        </div>
        <div class="kpi-card income">
          <div class="kpi-label">Total Recaudado (Ingresos Caja)</div>
          <div class="kpi-value" style="color:var(--acc-income);">${this.fmtMoney(finanzas.totalIngresos)}</div>
          <div class="kpi-sub">Cuotas iniciales + Abonos recibidos</div>
        </div>
        <div class="kpi-card receivable">
          <div class="kpi-label">Cartera por Cobrar (Clientes)</div>
          <div class="kpi-value" style="color:var(--acc-receivable);">${this.fmtMoney(finanzas.totalCarteraPendiente)}</div>
          <div class="kpi-sub">Saldo financiado pendiente de recaudo</div>
        </div>
        <div class="kpi-card expense">
          <div class="kpi-label">Egresos Urbanismo & Proyecto</div>
          <div class="kpi-value" style="color:var(--acc-expense);">${this.fmtMoney(finanzas.totalEgresos)}</div>
          <div class="kpi-sub">Flujo Neto Caja: <strong>${this.fmtMoney(finanzas.flujoCajaNeto)}</strong></div>
        </div>
      `;
    }

    const tbodyManzanas = document.getElementById('table-dashboard-manzanas');
    if (tbodyManzanas) {
      tbodyManzanas.innerHTML = (porManzana || [])
        .map(
          (m) => `
          <tr>
            <td><strong>${m.manzana}</strong></td>
            <td class="mono">${m.total} lotes (${m.total * 600} m²)</td>
            <td><span class="status-badge disponible">${m.disponibles}</span></td>
            <td><span class="status-badge reservado">${m.reservados}</span></td>
            <td><span class="status-badge vendido">${m.vendidos}</span></td>
            <td class="mono"><strong>${this.fmtMoney(m.valor_manzana)}</strong></td>
          </tr>
        `
        )
        .join('');
    }

    const tbodyCobros = document.getElementById('table-dashboard-cobros');
    if (tbodyCobros) {
      if (!proximosCobros || proximosCobros.length === 0) {
        tbodyCobros.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted-light); padding:1.2rem;">No hay cobros pendientes registrados.</td></tr>`;
      } else {
        tbodyCobros.innerHTML = proximosCobros
          .map(
            (c) => `
            <tr>
              <td class="mono"><strong>${c.lote_codigo}</strong></td>
              <td>
                <strong>${c.cliente_nombre}</strong>
                <div style="font-size:0.74rem; color:var(--text-muted-light);">${c.telefono || ''}</div>
              </td>
              <td class="mono">${c.fecha_proximo_pago ? String(c.fecha_proximo_pago).slice(0, 10) : 'Al día'}</td>
              <td class="mono">${this.fmtMoney(c.valor_cuota_mensual)}</td>
              <td class="mono" style="color:var(--acc-receivable);"><strong>${this.fmtMoney(c.saldo_pendiente)}</strong></td>
              <td>
                <button class="btn btn-emerald btn-sm" onclick="window.app.openNewAbonoModal(${c.id})">Abonar</button>
              </td>
            </tr>
          `
          )
          .join('');
      }
    }

    const tbodyMovs = document.getElementById('table-dashboard-movimientos');
    if (tbodyMovs) {
      if (!ultimosMovimientos || ultimosMovimientos.length === 0) {
        tbodyMovs.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted-light); padding:1.2rem;">No hay movimientos contables registrados.</td></tr>`;
      } else {
        tbodyMovs.innerHTML = ultimosMovimientos
          .map(
            (m) => `
            <tr>
              <td class="mono">${m.codigo_asiento}</td>
              <td class="mono">${String(m.fecha).slice(0, 10)}</td>
              <td>
                <span class="status-badge ${m.tipo === 'INGRESO' ? 'disponible' : 'vendido'}">${m.tipo}</span>
              </td>
              <td class="mono" style="font-size:0.75rem;">${m.categoria}</td>
              <td class="mono">${m.lote_codigo || 'General'}</td>
              <td><strong>${m.tercero}</strong></td>
              <td>${m.concepto}</td>
              <td class="mono" style="font-weight:700; color:${m.tipo === 'INGRESO' ? 'var(--acc-income)' : 'var(--acc-expense)'};">
                ${m.tipo === 'INGRESO' ? '+' : '-'}${this.fmtMoney(m.monto)}
              </td>
            </tr>
          `
          )
          .join('');
      }
    }
  }

  // =========================================================================
  // RENDERIZADO VISTA 4: REGISTRO DETALLADO DE LOS 38 LOTES
  // =========================================================================
  renderLotsRegistryTable() {
    const tbody = document.getElementById('table-lots-registry');
    if (!tbody) return;

    const search = (document.getElementById('registry-search-input')?.value || '').toLowerCase().trim();
    const manzanaFilter = document.getElementById('registry-manzana-filter')?.value || 'todas';
    const estadoFilter = document.getElementById('registry-estado-filter')?.value || 'todos';

    const filtered = this.lotes.filter((l) => {
      if (manzanaFilter !== 'todas' && l.manzana !== manzanaFilter) return false;
      if (estadoFilter !== 'todos' && l.estado !== estadoFilter) return false;
      if (search) {
        const haystack = `${l.codigo} ${l.manzana} ${l.cliente_nombre || ''} ${l.codigo_contrato || ''} ${l.orientacion}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    tbody.innerHTML = filtered
      .map(
        (l) => `
        <tr>
          <td class="mono"><strong>#${String(l.numero_lote).padStart(2, '0')}</strong></td>
          <td class="mono" style="color:var(--gold-primary); font-weight:700;">${l.codigo}</td>
          <td>${l.manzana}</td>
          <td class="mono">${l.frente_m.toFixed(0)}m × ${l.fondo_m.toFixed(0)}m = <strong>${l.area_m2.toFixed(0)} m²</strong></td>
          <td class="mono">${this.fmtMoney(l.precio_m2)}</td>
          <td class="mono"><strong>${this.fmtMoney(l.precio_total)}</strong></td>
          <td><span class="status-badge ${l.estado}">${l.estado}</span></td>
          <td>
            ${
              l.cliente_nombre
                ? `<strong>${l.cliente_nombre}</strong><div class="mono" style="font-size:0.72rem; color:var(--text-muted-light);">${l.codigo_contrato || ''}</div>`
                : '<span style="color:var(--text-muted-light);">Disponible para adjudicar</span>'
            }
          </td>
          <td class="mono">
            ${
              l.venta_id
                ? `<div style="color:var(--acc-income);">Abonado: ${this.fmtMoney(l.total_abonado)}</div>
                   <div style="color:var(--acc-receivable); font-size:0.76rem;">Saldo: ${this.fmtMoney(l.saldo_pendiente)}</div>`
                : '—'
            }
          </td>
          <td>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              <button class="btn btn-outline-dark btn-sm" onclick="window.app.openLotDossierModal(${l.id})" title="Expediente Completo">📋 Ficha</button>
              <button class="btn btn-gold btn-sm" onclick="window.app.openLotIn3DStudio(${l.id})" title="Render 3D">🏠 3D</button>
              ${
                l.estado === 'disponible'
                  ? `<button class="btn btn-emerald btn-sm" onclick="window.app.openNewSaleModal(${l.id})">Vender</button>`
                  : `<button class="btn btn-emerald btn-sm" onclick="window.app.openNewAbonoModal(${l.venta_id || ''})">Abonar</button>`
              }
            </div>
          </td>
        </tr>
      `
      )
      .join('');
  }

  // =========================================================================
  // MODAL EXPEDIENTE DETALLADO POR LOTE
  // =========================================================================
  async openLotDossierModal(loteId) {
    try {
      const res = await fetch(`/api/lotes/${loteId}`);
      const data = await res.json();
      if (!data.lote) return;

      const { lote, abonos } = data;
      const container = document.getElementById('lot-dossier-content');
      if (!container) return;

      const pctPagado = lote.valor_total_venta
        ? Math.min(100, Math.round((Number(lote.total_abonado || 0) / Number(lote.valor_total_venta)) * 100))
        : 0;

      container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.2rem; padding-bottom:1rem; border-bottom:1px solid var(--border-light);">
          <div>
            <span class="mono" style="color:var(--gold-primary); font-weight:700;">EXPEDIENTE TÉCNICO, CATASTRAL Y CONTABLE</span>
            <h2 class="serif" style="font-size:2rem;">Lote #${String(lote.numero_lote).padStart(2, '0')} · Código ${lote.codigo} (${lote.manzana})</h2>
            <p style="font-size:0.84rem; color:var(--text-muted-light);">
              Dimensiones Oficiales: <strong>${lote.frente_m.toFixed(2)}m Frente × ${lote.fondo_m.toFixed(2)}m Fondo = ${lote.area_m2.toFixed(2)} m²</strong> · Matrícula: <span class="mono">${lote.matricula_inmobiliaria}</span>
            </p>
          </div>
          <span class="status-badge ${lote.estado}" style="font-size:0.86rem;">${lote.estado.toUpperCase()}</span>
        </div>

        <form id="form-update-lot-dossier" data-id="${lote.id}">
          <div class="form-grid-3">
            <div class="form-group">
              <label>Precio por m² (COP)</label>
              <input type="number" id="dossier-precio-m2" class="form-control mono" value="${lote.precio_m2}" />
            </div>
            <div class="form-group">
              <label>Valor Total Lote (600 m²)</label>
              <input type="text" class="form-control mono" value="${this.fmtMoney(lote.precio_total)}" disabled />
            </div>
            <div class="form-group">
              <label>Estado del Lote</label>
              <select id="dossier-estado" class="form-control">
                <option value="disponible" ${lote.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
                <option value="reservado" ${lote.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
                <option value="vendido" ${lote.estado === 'vendido' ? 'selected' : ''}>Vendido</option>
              </select>
            </div>
          </div>

          <div class="form-grid-2">
            <div class="form-group">
              <label>Lindero Norte (20.00m)</label>
              <input type="text" id="dossier-norte" class="form-control" value="${lote.lindero_norte || ''}" />
            </div>
            <div class="form-group">
              <label>Lindero Sur (20.00m)</label>
              <input type="text" id="dossier-sur" class="form-control" value="${lote.lindero_sur || ''}" />
            </div>
            <div class="form-group">
              <label>Lindero Oriente (30.00m)</label>
              <input type="text" id="dossier-oriente" class="form-control" value="${lote.lindero_oriente || ''}" />
            </div>
            <div class="form-group">
              <label>Lindero Occidente (30.00m)</label>
              <input type="text" id="dossier-occidente" class="form-control" value="${lote.lindero_occidente || ''}" />
            </div>
          </div>

          <div class="form-group">
            <label>Descripción Técnica y Observaciones del Lote</label>
            <input type="text" id="dossier-descripcion" class="form-control" value="${lote.descripcion || ''}" />
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.8rem; margin-bottom:1.4rem;">
            <div style="display:flex; gap:0.5rem;">
              <button type="button" class="btn btn-outline-dark btn-sm" onclick="window.app.closeModal('modal-lot-dossier'); window.app.openLotIn3DStudio(${lote.id});">
                🏠 Abrir Estudio Render 3D de este Lote
              </button>
              <button type="button" class="btn btn-outline-dark btn-sm" onclick="window.app.closeModal('modal-lot-dossier'); window.app.switchAdminView('view-geospatial'); window.geospatialViewer.selectLotOnMap(${lote.id}, true);">
                🛰️ Ver en Mapa Satelital
              </button>
            </div>
            <button type="submit" class="btn btn-gold btn-sm">💾 Guardar Cambios Ficha en MySQL</button>
          </div>
        </form>

        ${
          lote.venta_id
            ? `
          <div style="background:var(--bg-alabaster); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:1.1rem; margin-bottom:1.2rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
              <strong>📑 Contrato Activo: ${lote.codigo_contrato} — Comprador: ${lote.cliente_nombre} (${lote.cliente_documento})</strong>
              <span class="mono" style="color:var(--acc-income); font-weight:700;">Progreso Pago: ${pctPagado}%</span>
            </div>
            <div style="height:10px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin-bottom:0.75rem;">
              <div style="width:${pctPagado}%; height:100%; background:var(--acc-income);"></div>
            </div>
            <div class="form-grid-3 mono" style="font-size:0.82rem;">
              <div>Valor Contrato: <strong>${this.fmtMoney(lote.valor_total_venta)}</strong></div>
              <div style="color:var(--acc-income);">Total Abonado: <strong>${this.fmtMoney(lote.total_abonado)}</strong></div>
              <div style="color:var(--acc-receivable);">Saldo Pendiente: <strong>${this.fmtMoney(lote.saldo_pendiente)}</strong></div>
            </div>
          </div>

          <h4 class="serif" style="font-size:1.3rem; margin-bottom:0.5rem;">Historial de Pagos y Abonos de este Lote</h4>
          <div class="data-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Fecha</th>
                  <th>Cuota</th>
                  <th>Saldo Anterior</th>
                  <th>Monto Abonado</th>
                  <th>Nuevo Saldo</th>
                  <th>Método</th>
                </tr>
              </thead>
              <tbody>
                ${(abonos || [])
                  .map(
                    (a) => `
                  <tr>
                    <td class="mono"><strong>${a.codigo_recibo}</strong></td>
                    <td class="mono">${String(a.fecha_abono).slice(0, 10)}</td>
                    <td class="mono">#${a.numero_cuota}</td>
                    <td class="mono">${this.fmtMoney(a.saldo_anterior)}</td>
                    <td class="mono" style="color:var(--acc-income); font-weight:700;">+${this.fmtMoney(a.monto)}</td>
                    <td class="mono">${this.fmtMoney(a.nuevo_saldo)}</td>
                    <td>${a.metodo_pago}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `
            : `<div style="padding:1rem; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:var(--radius-sm); display:flex; justify-content:space-between; align-items:center;">
                <span>🟢 Este lote de 600 m² se encuentra disponible para adjudicación inmediata.</span>
                <button class="btn btn-emerald btn-sm" onclick="window.app.closeModal('modal-lot-dossier'); window.app.openNewSaleModal(${lote.id});">+ Adjudicar Lote</button>
              </div>`
        }
      `;

      document.getElementById('form-update-lot-dossier')?.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        await fetch(`/api/lotes/${lote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            precio_m2: Number(document.getElementById('dossier-precio-m2').value),
            estado: document.getElementById('dossier-estado').value,
            lindero_norte: document.getElementById('dossier-norte').value,
            lindero_sur: document.getElementById('dossier-sur').value,
            lindero_oriente: document.getElementById('dossier-oriente').value,
            lindero_occidente: document.getElementById('dossier-occidente').value,
            descripcion: document.getElementById('dossier-descripcion').value
          })
        });
        this.showToast(`Expediente del lote ${lote.codigo} actualizado en MySQL.`);
        this.closeModal('modal-lot-dossier');
        await this.refreshAllData();
      });

      this.openModal('modal-lot-dossier');
    } catch (error) {
      console.error('Error abriendo expediente del lote:', error);
    }
  }

  // =========================================================================
  // RENDERIZADO VISTA 5: CONTABILIDAD, CONTRATOS Y ABONOS
  // =========================================================================
  renderAccountingLedgerTable() {
    const tbody = document.getElementById('table-accounting-ledger');
    if (!tbody) return;

    const filterType = document.getElementById('accounting-type-filter')?.value || 'TODOS';
    const movs = (this.contabilidad.movimientos || []).filter((m) =>
      filterType === 'TODOS' ? true : m.tipo === filterType
    );

    if (movs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; color:var(--text-muted-light); padding:1.5rem;">Sin movimientos contables registrados. Haz clic en "+ Nuevo Asiento Contable" para registrar ingresos o egresos reales.</td></tr>`;
      return;
    }

    tbody.innerHTML = movs
      .map(
        (m) => `
        <tr>
          <td class="mono"><strong>${m.codigo_asiento}</strong></td>
          <td class="mono">${String(m.fecha).slice(0, 10)}</td>
          <td><span class="status-badge ${m.tipo === 'INGRESO' ? 'disponible' : 'vendido'}">${m.tipo}</span></td>
          <td class="mono" style="font-size:0.75rem;">${m.categoria}</td>
          <td class="mono">${m.lote_codigo || 'Proyecto'}</td>
          <td><strong>${m.tercero}</strong></td>
          <td>${m.concepto}</td>
          <td class="mono">${m.comprobante || '—'}</td>
          <td class="mono" style="font-weight:700; color:${m.tipo === 'INGRESO' ? 'var(--acc-income)' : 'var(--acc-expense)'};">
            ${m.tipo === 'INGRESO' ? '+' : '-'}${this.fmtMoney(m.monto)}
          </td>
          <td>
            <button class="btn btn-outline-dark btn-sm" onclick="window.app.deleteAccountingEntry(${m.id})" title="Eliminar asiento">🗑️</button>
          </td>
        </tr>
      `
      )
      .join('');
  }

  renderVentasTable() {
    const tbody = document.getElementById('table-ventas-list');
    if (!tbody) return;

    if (!this.ventas || this.ventas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--text-muted-light); padding:1.5rem;">No hay contratos de venta registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.ventas
      .map(
        (v) => `
        <tr>
          <td class="mono"><strong>${v.codigo_contrato}</strong></td>
          <td class="mono">${String(v.fecha_venta).slice(0, 10)}</td>
          <td class="mono"><strong>${v.lote_codigo}</strong> (${v.manzana})</td>
          <td>
            <strong>${v.cliente_nombre}</strong>
            <div class="mono" style="font-size:0.72rem; color:var(--text-muted-light);">${v.cliente_documento}</div>
          </td>
          <td><span class="status-badge ${v.modalidad === 'contado' ? 'disponible' : 'reservado'}">${v.modalidad}</span></td>
          <td>${v.modelo_casa || 'Solo Lote 600m²'}</td>
          <td class="mono"><strong>${this.fmtMoney(v.valor_total_venta)}</strong></td>
          <td class="mono" style="color:var(--acc-income);"><strong>${this.fmtMoney(v.total_abonado)}</strong></td>
          <td class="mono" style="color:var(--acc-receivable);"><strong>${this.fmtMoney(v.saldo_pendiente)}</strong></td>
          <td class="mono">${v.valor_cuota_mensual > 0 ? this.fmtMoney(v.valor_cuota_mensual) : 'Pagado'}</td>
          <td>
            ${
              Number(v.saldo_pendiente) > 0
                ? `<button class="btn btn-emerald btn-sm" onclick="window.app.openNewAbonoModal(${v.id})">+ Abonar</button>`
                : '<span class="status-badge disponible">PAZ Y SALVO</span>'
            }
          </td>
        </tr>
      `
      )
      .join('');
  }

  renderAbonosTable() {
    const tbody = document.getElementById('table-abonos-list');
    if (!tbody) return;

    if (!this.abonos || this.abonos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--text-muted-light); padding:1.5rem;">No hay abonos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.abonos
      .map(
        (a) => `
        <tr>
          <td class="mono"><strong>${a.codigo_recibo}</strong></td>
          <td class="mono">${String(a.fecha_abono).slice(0, 10)}</td>
          <td class="mono">${a.codigo_contrato}</td>
          <td class="mono"><strong>${a.lote_codigo}</strong></td>
          <td>${a.cliente_nombre}</td>
          <td class="mono">#${a.numero_cuota}</td>
          <td class="mono">${this.fmtMoney(a.saldo_anterior)}</td>
          <td class="mono" style="color:var(--acc-income); font-weight:700;">+${this.fmtMoney(a.monto)}</td>
          <td class="mono" style="color:var(--acc-receivable); font-weight:700;">${this.fmtMoney(a.nuevo_saldo)}</td>
          <td>${a.metodo_pago}</td>
          <td>
            <button class="btn btn-outline-dark btn-sm" onclick="window.app.printReceipt(${a.id})">🖨️ Recibo</button>
          </td>
        </tr>
      `
      )
      .join('');
  }

  renderClientsTable() {
    const tbody = document.getElementById('table-clients-list');
    if (!tbody) return;

    if (!this.clientes || this.clientes.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted-light); padding:1.5rem;">No hay clientes registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.clientes
      .map(
        (c) => `
        <tr>
          <td class="mono">#${c.id}</td>
          <td><strong>${c.nombre}</strong><div style="font-size:0.74rem; color:var(--text-muted-light);">${c.ocupacion || ''}</div></td>
          <td class="mono">${c.documento}</td>
          <td class="mono">${c.telefono}</td>
          <td>${c.correo || '—'}</td>
          <td>${c.ciudad || '—'}</td>
          <td class="mono"><strong>${c.codigos_lotes || 'Sin adjudicar'}</strong> (${c.lotes_adquiridos || 0})</td>
          <td class="mono"><strong>${this.fmtMoney(c.inversion_total)}</strong></td>
          <td class="mono" style="color:var(--acc-receivable);"><strong>${this.fmtMoney(c.deuda_actual)}</strong></td>
        </tr>
      `
      )
      .join('');
  }

  // =========================================================================
  // MODALES Y CREACIÓN DE VENTAS, ABONOS Y ASIENTOS CONTABLES
  // =========================================================================
  openNewSaleModal(preselectedLotId = null, preselectedModel = null, customHouseCost = null) {
    const lotSelect = document.getElementById('sale-lote-id');
    const cliSelect = document.getElementById('sale-cliente-id');

    if (lotSelect) {
      const availableLots = this.lotes.filter(
        (l) => l.estado === 'disponible' || l.id === Number(preselectedLotId)
      );
      lotSelect.innerHTML = availableLots
        .map(
          (l) =>
            `<option value="${l.id}" data-price="${l.precio_total}">${l.codigo} (${l.manzana}) — 600 m² · ${this.fmtMoney(l.precio_total)}</option>`
        )
        .join('');
      if (preselectedLotId) lotSelect.value = String(preselectedLotId);
    }

    if (cliSelect) {
      cliSelect.innerHTML =
        `<option value="">-- Crear nuevo comprador abajo --</option>` +
        this.clientes.map((c) => `<option value="${c.id}">${c.nombre} (${c.documento})</option>`).join('');
    }

    if (preselectedModel && customHouseCost !== null) {
      const modelSelect = document.getElementById('sale-modelo-casa');
      if (modelSelect) {
        const labelMap = {
          villa_terranova_1p: `${customHouseCost}|Villa Terranova 1 Piso Personalizada 3D`,
          residencia_imperial_2p: `${customHouseCost}|Residencia Imperial 2 Pisos Personalizada 3D`,
          ecolodge_minimalista: `${customHouseCost}|Eco-Lodge Minimalista Personalizado 3D`,
          solo_terreno_600m2: `0|Solo Lote 600m² (20x30m)`
        };
        const valStr = labelMap[preselectedModel];
        if (valStr) {
          const opt = document.createElement('option');
          opt.value = valStr;
          opt.textContent = `+ Diseño 3D Actual (${this.fmtMoney(customHouseCost)})`;
          opt.selected = true;
          modelSelect.prepend(opt);
        }
      }
    }

    this.recalculateSaleFormDefaults();
    this.openModal('modal-new-sale');
  }

  recalculateSaleFormDefaults() {
    const lotSelect = document.getElementById('sale-lote-id');
    const modelSelect = document.getElementById('sale-modelo-casa');
    const modalidadSelect = document.getElementById('sale-modalidad');
    if (!lotSelect) return;

    const selectedLot = this.lotes.find((l) => l.id === Number(lotSelect.value));
    const lotPrice = selectedLot ? Number(selectedLot.precio_total) : 150000000;
    const [housePriceStr] = (modelSelect?.value || '0|Solo Lote').split('|');
    const housePrice = Number(housePriceStr || 0);
    const total = lotPrice + housePrice;

    const inputValorLote = document.getElementById('sale-valor-lote');
    const inputInicial = document.getElementById('sale-cuota-inicial');
    if (inputValorLote) inputValorLote.value = lotPrice;

    const mod = modalidadSelect?.value || 'financiado';
    if (inputInicial) {
      if (mod === 'contado') inputInicial.value = total;
      else if (mod === 'reserva') inputInicial.value = Math.round(total * 0.1);
      else inputInicial.value = Math.round(total * 0.3);
    }
  }

  async handleNewSaleSubmit(e) {
    e.preventDefault();
    const lote_id = Number(document.getElementById('sale-lote-id').value);
    const cliente_id = document.getElementById('sale-cliente-id').value;
    const modalidad = document.getElementById('sale-modalidad').value;
    const [houseCostStr, houseName] = document.getElementById('sale-modelo-casa').value.split('|');
    const valor_casa_3d = Number(houseCostStr || 0);

    const payload = {
      lote_id,
      cliente_id: cliente_id ? Number(cliente_id) : null,
      nuevo_cliente: !cliente_id
        ? {
            nombre: document.getElementById('sale-new-cli-nombre').value,
            documento: document.getElementById('sale-new-cli-doc').value,
            telefono: document.getElementById('sale-new-cli-tel').value
          }
        : null,
      modalidad,
      incluye_casa_3d: valor_casa_3d > 0 ? 1 : 0,
      modelo_casa: houseName,
      valor_lote: Number(document.getElementById('sale-valor-lote').value),
      valor_casa_3d,
      descuento: Number(document.getElementById('sale-descuento').value || 0),
      cuota_inicial: Number(document.getElementById('sale-cuota-inicial').value || 0),
      numero_cuotas: Number(document.getElementById('sale-numero-cuotas').value || 12),
      fecha_proximo_pago: document.getElementById('sale-proximo-pago').value,
      metodo_pago_inicial: document.getElementById('sale-metodo-pago').value,
      asesor_comercial: this.user ? this.user.nombre_completo : 'Administración Terranova',
      observaciones: document.getElementById('sale-observaciones').value
    };

    const res = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error registrando venta');
      return;
    }

    this.closeModal('modal-new-sale');
    this.showToast(data.message);
    await this.refreshAllData();
  }

  openNewAbonoModal(preselectedVentaId = null) {
    const select = document.getElementById('abono-venta-id');
    const activeVentas = (this.ventas || []).filter((v) => Number(v.saldo_pendiente) > 0);

    if (select) {
      select.innerHTML = activeVentas
        .map(
          (v) =>
            `<option value="${v.id}" data-cuota="${v.valor_cuota_mensual}" data-saldo="${v.saldo_pendiente}">
              ${v.lote_codigo} (${v.codigo_contrato}) — ${v.cliente_nombre} · Saldo: ${this.fmtMoney(v.saldo_pendiente)}
            </option>`
        )
        .join('');

      if (preselectedVentaId) {
        select.value = String(preselectedVentaId);
      }

      const updateSuggestedAmount = () => {
        const chosen = activeVentas.find((v) => v.id === Number(select.value));
        const montoInput = document.getElementById('abono-monto');
        if (chosen && montoInput) {
          montoInput.value = Number(chosen.valor_cuota_mensual) > 0
            ? Math.round(Number(chosen.valor_cuota_mensual))
            : Math.round(Number(chosen.saldo_pendiente));
        }
      };

      select.onchange = updateSuggestedAmount;
      updateSuggestedAmount();
    }

    this.openModal('modal-new-abono');
  }

  async handleNewAbonoSubmit(e) {
    e.preventDefault();
    const payload = {
      venta_id: Number(document.getElementById('abono-venta-id').value),
      monto: Number(document.getElementById('abono-monto').value),
      metodo_pago: document.getElementById('abono-metodo').value,
      fecha_abono: document.getElementById('abono-fecha').value,
      proximo_pago: document.getElementById('abono-proximo-pago').value,
      concepto: document.getElementById('abono-concepto').value
    };

    const res = await fetch('/api/abonos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error registrando abono');
      return;
    }

    this.closeModal('modal-new-abono');
    this.showToast(data.message);
    await this.refreshAllData();
  }

  openNewAccountingModal() {
    const loteSel = document.getElementById('acc-lote-id');
    if (loteSel) {
      loteSel.innerHTML =
        `<option value="">General del Proyecto (Urbanismo / Administración)</option>` +
        this.lotes.map((l) => `<option value="${l.id}">${l.codigo} (${l.manzana})</option>`).join('');
    }
    this.openModal('modal-new-accounting');
  }

  async handleNewAccountingSubmit(e) {
    e.preventDefault();
    const payload = {
      tipo: document.getElementById('acc-tipo').value,
      categoria: document.getElementById('acc-categoria').value,
      tercero: document.getElementById('acc-tercero').value,
      documento_tercero: document.getElementById('acc-doc-tercero').value,
      monto: Number(document.getElementById('acc-monto').value),
      fecha: document.getElementById('acc-fecha').value,
      lote_id: document.getElementById('acc-lote-id').value || null,
      concepto: document.getElementById('acc-concepto').value
    };

    const res = await fetch('/api/contabilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error guardando asiento contable');
      return;
    }

    this.closeModal('modal-new-accounting');
    e.target.reset();
    this.setDefaultFormDates();
    this.showToast(data.message);
    await this.refreshAllData();
  }

  async deleteAccountingEntry(id) {
    await fetch(`/api/contabilidad/${id}`, { method: 'DELETE' });
    this.showToast('Asiento contable eliminado de MySQL.');
    await this.refreshAllData();
  }

  async handleNewClientSubmit(e) {
    e.preventDefault();
    const payload = {
      nombre: document.getElementById('cli-nombre').value,
      documento: document.getElementById('cli-documento').value,
      telefono: document.getElementById('cli-telefono').value,
      correo: document.getElementById('cli-correo').value,
      ciudad: document.getElementById('cli-ciudad').value,
      ocupacion: document.getElementById('cli-ocupacion').value
    };

    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Error registrando cliente');
      return;
    }

    this.closeModal('modal-new-client');
    e.target.reset();
    this.showToast(data.message);
    await this.refreshAllData();
  }

  printReceipt(abonoId) {
    const a = this.abonos.find((item) => item.id === Number(abonoId));
    if (!a) return;

    const win = window.open('', '_blank', 'width=720,height=620');
    if (!win) return;

    win.document.write(`
      <html>
      <head>
        <title>Recibo de Caja ${a.codigo_recibo} - Prados de Terranova</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 36px; color: #11221b; }
          .box { border: 2px solid #11221b; border-radius: 12px; padding: 28px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #d9822b; padding-bottom: 16px; margin-bottom: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; }
          .total { background: #f6f4ee; padding: 14px; border-radius: 8px; font-size: 18px; font-weight: bold; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="box">
          <div class="header">
            <div>
              <h2 style="margin:0;">PRADOS DE TERRANOVA</h2>
              <small>Parcelación Campestre · 38 Lotes de 600 m² (20m × 30m)</small>
            </div>
            <div style="text-align:right;">
              <strong>RECIBO DE CAJA OFICIAL</strong><br/>
              <span style="color:#d9822b; font-weight:bold;">${a.codigo_recibo}</span><br/>
              <small>Fecha: ${String(a.fecha_abono).slice(0, 10)}</small>
            </div>
          </div>
          <div class="row"><span>Cliente / Pagador:</span> <strong>${a.cliente_nombre} (${a.cliente_documento})</strong></div>
          <div class="row"><span>Lote Campestre (20×30m = 600 m²):</span> <strong>${a.lote_codigo} (${a.manzana})</strong></div>
          <div class="row"><span>Contrato Asociado:</span> <strong>${a.codigo_contrato} (Cuota #${a.numero_cuota})</strong></div>
          <div class="row"><span>Concepto:</span> <strong>${a.concepto}</strong></div>
          <div class="row"><span>Método de Pago:</span> <strong>${a.metodo_pago}</strong></div>
          <hr/>
          <div class="row"><span>Saldo Anterior:</span> <span>${this.fmtMoney(a.saldo_anterior)}</span></div>
          <div class="row"><span>Valor Abonado en este Recibo:</span> <strong>${this.fmtMoney(a.monto)}</strong></div>
          <div class="total">Nuevo Saldo Pendiente: ${this.fmtMoney(a.nuevo_saldo)}</div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  }
}

window.app = new TerranovaApp();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
