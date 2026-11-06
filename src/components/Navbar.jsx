import { useStore, useHouse } from '../store';
import { HOUSES } from '../data/houses';

export default function Navbar() {
  const house = useHouse();
  const selectHouse = useStore((s) => s.selectHouse);
  const isNight = useStore((s) => s.isNight);
  const toggleNight = useStore((s) => s.toggleNight);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const section = useStore((s) => s.section);

  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const setLoginModalOpen = useStore((s) => s.setLoginModalOpen);
  const adminOpen = useStore((s) => s.adminOpen);
  const setAdminOpen = useStore((s) => s.setAdminOpen);
  const adminTab = useStore((s) => s.adminTab);
  const setAdminTab = useStore((s) => s.setAdminTab);
  const lotes = useStore((s) => s.lotes);

  const disponiblesCount = lotes.filter((l) => l.estado === 'disponible').length;
  const reservadosCount = lotes.filter((l) => l.estado === 'reservado').length;
  const vendidosCount = lotes.filter((l) => l.estado === 'vendido').length;

  const go = (id) => {
    if (adminOpen) setAdminOpen(false);
    if (mode === 'explore') setMode('tour');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const openModule = (tab) => {
    setAdminOpen(true, tab);
  };

  // ==================== NAVBAR EXCLUSIVO DE FUNCIONES / GESTIÓN ====================
  if (user && adminOpen) {
    return (
      <header className="navbar navbar-logged">
        <div className="nav-brand-group">
          <div className="nav-brand">
            <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
              <path d="M16 3 3 29h26z" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M9.5 22h13" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span>TERRANOVA</span>
          </div>
          <span className="nav-mode-tag">GESTIÓN</span>
        </div>

        <nav className="nav-links session-nav" aria-label="Funciones del sistema">
          {[
            ['compra', '💳 Compra & Financiación'],
            ['cartera', '📊 Cartera & Abonos'],
            ['satelital', '🛰️ Editor Satelital'],
            ['clientes', '👥 Clientes & Caja'],
          ].map(([tabId, label]) => (
            <button
              key={tabId}
              type="button"
              className={`nav-link ${adminTab === tabId ? 'active' : ''}`}
              onClick={() => setAdminTab(tabId)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          <div className="nav-mini-kpis" title="Resumen de lotes en tiempo real">
            <span className="nkpi disp">{disponiblesCount} Disp</span>
            <span className="nkpi res">{reservadosCount} Res</span>
            <span className="nkpi vend">{vendidosCount} Vend</span>
          </div>

          <button
            type="button"
            className="btn-switch-view"
            onClick={() => setAdminOpen(false)}
          >
            ← Ir a Landing Page
          </button>

          <div className="nav-user-pill">
            <span className="status-dot" />
            <strong>{user.username}</strong>
            <button
              type="button"
              className="nav-logout-mini"
              onClick={logout}
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ==================== NAVBAR DE LA LANDING PAGE ====================
  return (
    <header className="navbar">
      <a href="#hero" className="nav-brand" onClick={(e) => { e.preventDefault(); go('hero'); }}>
        <svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true">
          <path d="M16 3 3 29h26z" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M9.5 22h13" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
        <span>TERRANOVA</span>
      </a>

      <nav className="nav-links" aria-label="Secciones de la Landing">
        {[
          ['hero', 'Inicio'],
          ['lotes', 'Lotes 600 m² (Km 7)'],
          ['catalog', 'Casas Campestres'],
          ['configurator', 'Configurador'],
          ['details', 'Agua, Luz & Escrituras'],
          ['contact', 'Informes 311 514 8526'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`nav-link ${section === id && mode === 'tour' ? 'active' : ''}`}
            onClick={() => go(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="nav-actions">
        <div className="house-pills" role="tablist" aria-label="Cambiar propiedad">
          {HOUSES.map((h) => (
            <button
              key={h.id}
              role="tab"
              aria-selected={house.id === h.id}
              className={`pill ${house.id === h.id ? 'active' : ''}`}
              onClick={() => selectHouse(h.id)}
            >
              {h.name.split(' ')[1]}
            </button>
          ))}
        </div>

        <button
          className="icon-btn"
          onClick={toggleNight}
          title={isNight ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
          aria-label={isNight ? 'Cambiar a modo día' : 'Cambiar a modo noche'}
        >
          {isNight ? '☀ Día' : '☾ Noche'}
        </button>

        <button
          className={`btn-explore ${mode === 'explore' ? 'active' : ''}`}
          onClick={() => setMode(mode === 'explore' ? 'tour' : 'explore')}
        >
          {mode === 'explore' ? '✕ Salir 3D' : '⟲ Explorar 3D'}
        </button>

        {user ? (
          <button
            type="button"
            className="btn-auth logged"
            onClick={() => openModule(adminTab || 'compra')}
          >
            ⚡ Ir al Panel ({user.username})
          </button>
        ) : (
          <button
            type="button"
            className="btn-auth"
            onClick={() => setLoginModalOpen(true)}
          >
            🔐 Iniciar Sesión
          </button>
        )}
      </div>
    </header>
  );
}
