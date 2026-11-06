import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Experience from './three/Experience';
import Loader from './components/Loader';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SatelliteLotsSection from './components/SatelliteLotsSection';
import Catalog from './components/Catalog';
import Configurator from './components/Configurator';
import Details from './components/Details';
import Contact from './components/Contact';
import Footer from './components/Footer';
import LoginModal from './components/LoginModal';
import AdminPortal from './components/AdminPortal';
import { useStore, useHouse } from './store';
import { HOUSES, FACADE_MATERIALS } from './data/houses';

gsap.registerPlugin(ScrollTrigger);

function ExploreHud() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const house = useHouse();
  const selectHouse = useStore((s) => s.selectHouse);
  const facades = useStore((s) => s.facades);
  const setFacade = useStore((s) => s.setFacade);
  const isNight = useStore((s) => s.isNight);
  const toggleNight = useStore((s) => s.toggleNight);

  if (mode !== 'explore') return null;

  return (
    <div className="explore-hud">
      <div className="explore-hint">
        <span>Arrastra para rotar · Rueda para zoom · Clic en números para detalles</span>
      </div>
      <div className="explore-bar">
        <div className="explore-group">
          {HOUSES.map((h) => (
            <button
              key={h.id}
              className={`pill ${house.id === h.id ? 'active' : ''}`}
              onClick={() => selectHouse(h.id)}
            >
              {h.name}
            </button>
          ))}
        </div>

        <div className="explore-group">
          {house.facadeOptions.map((key) => (
            <button
              key={key}
              className={`mini-swatch ${facades[house.id] === key ? 'active' : ''}`}
              title={FACADE_MATERIALS[key]?.label}
              onClick={() => setFacade(key)}
              style={{ backgroundImage: `url(${FACADE_MATERIALS[key]?.swatch})` }}
            />
          ))}
        </div>

        <button className="icon-btn" onClick={toggleNight}>
          {isNight ? '☀ Día' : '☾ Noche'}
        </button>

        <button className="btn-primary compact" onClick={() => setMode('tour')}>
          Volver al recorrido
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const setSection = useStore((s) => s.setSection);
  const fading = useStore((s) => s.fading);
  const mode = useStore((s) => s.mode);
  const user = useStore((s) => s.user);
  const adminOpen = useStore((s) => s.adminOpen);

  useEffect(() => {
    if (adminOpen && user) return;

    const sections = document.querySelectorAll('[data-section]');
    const triggers = [];

    sections.forEach((el) => {
      const id = el.getAttribute('data-section');
      const panel = el.querySelector('.reveal');
      if (panel) {
        gsap.fromTo(
          panel,
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => setSection(id),
          onEnterBack: () => setSection(id),
        })
      );
    });

    return () => {
      triggers.forEach((t) => t.kill());
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [setSection, adminOpen, user]);

  // Vista separada: Sistema de Gestión (cuando hay sesión activa y estamos en el panel)
  if (user && adminOpen) {
    return (
      <>
        <Navbar />
        <AdminPortal />
      </>
    );
  }

  // Vista pública: Landing Page 3D + Mapa de Lotes
  return (
    <>
      <Loader />
      <div className="canvas-stage" aria-hidden="true">
        <Experience />
      </div>
      <div className={`scene-curtain ${fading ? 'show' : ''}`} />
      <Navbar />
      <ExploreHud />
      <LoginModal />
      <main className={`page-content ${mode === 'explore' ? 'hidden' : ''}`}>
        <Hero />
        <SatelliteLotsSection />
        <Catalog />
        <Configurator />
        <Details />
        <Contact />
        <Footer />
      </main>
    </>
  );
}
