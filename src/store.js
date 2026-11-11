import { create } from 'zustand';
import { HOUSES, HOUSE_BY_ID } from './data/houses';
import {
  computeLoteoGeometry,
  DEFAULT_LOTEO_CONFIG,
  INITIAL_SOLD_LOTS,
} from './utils/lotGeometry';

const defaultFacades = Object.fromEntries(HOUSES.map((h) => [h.id, h.defaultFacade]));

const initialGeo = computeLoteoGeometry(DEFAULT_LOTEO_CONFIG, []);
const initialLots = initialGeo.lots.map((l) => ({
  ...l,
  estado: INITIAL_SOLD_LOTS.has(Number(l.numero_lote)) ? 'vendido' : 'disponible',
}));

const savedAuth = (() => {
  try {
    const raw = localStorage.getItem('terranova_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

export const useStore = create((set, get) => ({
  houseId: 'villa',
  facades: defaultFacades,
  frameColor: 'black',
  isNight: false,
  section: 'hero',
  mode: 'tour', // 'tour' | 'explore'
  activeHotspot: null,
  fading: false,
  loaded: false,

  // Estado de autenticación y Panel de Control (separado de la landing page)
  user: savedAuth?.user || null,
  token: savedAuth?.token || null,
  loginModalOpen: false,
  adminOpen: Boolean(savedAuth?.user),
  adminTab: 'compra', // 'compra' | 'cartera' | 'satelital' | 'clientes'

  // Estado de lotes satelitales (Prados de Terranova - MySQL)
  lotes: initialLots,
  loteoConfig: initialGeo.config,
  loteoOverlays: initialGeo.overlays,
  selectedLotNumero: 1,
  loadingLotes: false,

  setLoaded: (loaded) => set({ loaded }),
  setSection: (section) => set({ section, activeHotspot: null }),
  setFacade: (key) => set((s) => ({ facades: { ...s.facades, [s.houseId]: key } })),
  setFrameColor: (frameColor) => set({ frameColor }),
  toggleNight: () => set((s) => ({ isNight: !s.isNight })),
  setHotspot: (activeHotspot) => set({ activeHotspot }),
  setMode: (mode) => {
    document.body.classList.toggle('exploring', mode === 'explore');
    set({ mode, activeHotspot: null });
  },
  selectHouse: (id) => {
    if (id === get().houseId || get().fading || !HOUSE_BY_ID[id]) return;
    set({ fading: true, activeHotspot: null });
    setTimeout(() => set({ houseId: id }), 500);
    setTimeout(() => set({ fading: false }), 1100);
  },

  // Acciones de sesión y admin
  setLoginModalOpen: (loginModalOpen) => set({ loginModalOpen }),
  setAdminOpen: (adminOpen, tab) => {
    set((s) => ({
      adminOpen,
      adminTab: tab || s.adminTab,
    }));
  },
  setAdminTab: (adminTab) => set({ adminTab }),
  setAuth: (user, token) => {
    try {
      localStorage.setItem('terranova_auth', JSON.stringify({ user, token }));
    } catch {
      // ignore storage errors
    }
    set({ user, token, loginModalOpen: false, adminOpen: true });
  },
  logout: () => {
    try {
      localStorage.removeItem('terranova_auth');
    } catch {
      // ignore
    }
    set({ user: null, token: null, adminOpen: false });
  },

  // Acciones de lotes MySQL
  setSelectedLotNumero: (selectedLotNumero) => set({ selectedLotNumero: Number(selectedLotNumero) }),
  openPurchaseForLot: (numeroLote) => {
    const s = get();
    set({ selectedLotNumero: Number(numeroLote) });
    if (s.user) {
      set({ adminOpen: true, adminTab: 'compra' });
    } else {
      set({ loginModalOpen: true });
    }
  },
  openSatelliteEditorForLot: (numeroLote) => {
    const s = get();
    if (numeroLote) set({ selectedLotNumero: Number(numeroLote) });
    if (s.user) {
      set({ adminOpen: true, adminTab: 'satelital' });
    } else {
      set({ loginModalOpen: true });
    }
  },
  fetchLotes: async () => {
    set({ loadingLotes: true });
    try {
      const res = await fetch('/api/lotes');
      if (!res.ok) throw new Error('Error consultando lotes');
      const data = await res.json();
      set({
        lotes: data.lots || [],
        loteoConfig: data.config || DEFAULT_LOTEO_CONFIG,
        loteoOverlays: data.overlays || null,
        loadingLotes: false,
      });
    } catch (err) {
      console.error('Error cargando lotes desde MySQL:', err);
      set({ loadingLotes: false });
    }
  },
}));

export const useHouse = () => useStore((s) => HOUSE_BY_ID[s.houseId]);
