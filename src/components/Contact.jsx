import { useState } from 'react';
import { useStore, useHouse } from '../store';
import { HOUSES, FACADE_MATERIALS, FRAME_COLORS, PROJECT_INFO } from '../data/houses';

export default function Contact() {
  const house = useHouse();
  const selectHouse = useStore((s) => s.selectHouse);
  const facades = useStore((s) => s.facades);
  const frameColor = useStore((s) => s.frameColor);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    modality: 'presencial',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Ingresa tu nombre completo';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Ingresa un correo válido';
    if (form.phone.trim().length < 7) e.phone = 'Ingresa un teléfono de contacto';
    if (!form.date) e.date = 'Selecciona una fecha tentativa';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitted({
      ...form,
      houseName: house.name,
      facade: FACADE_MATERIALS[facades[house.id]]?.label,
      frame: FRAME_COLORS[frameColor]?.label,
    });
  };

  return (
    <section id="contact" className="section section-right" data-section="contact">
      <div className="panel contact-panel reveal">
        <span className="eyebrow">
          04 · INFORMES Y VENTAS · CEL. {PROJECT_INFO.phoneDisplay}
        </span>
        <h2>Agenda tu Visita en el Km 7 Vía Yopal - Aguazul</h2>
        <p className="sub">
          Visítanos en el <strong>kilómetro 7 vía Yopal - Aguazul margen derecha, a 300 metros de la vía principal</strong>. Conoce en terreno tu lote campestre de <strong>600 m² (20 × 30 m)</strong> con <strong>servicios de agua y luz</strong> y <strong>escrituras legales individuales</strong>. Informes al <strong className="gold">Cel. {PROJECT_INFO.phoneDisplay}</strong>.
        </p>

        {submitted ? (
          <div className="confirm-card" role="status">
            <div className="confirm-badge">✓ Solicitud registrada</div>
            <h3>Gracias, {submitted.name}</h3>
            <p>
              Nos comunicaremos contigo desde nuestra línea oficial <strong>Cel. {PROJECT_INFO.phoneDisplay}</strong> o al correo <strong>{submitted.email}</strong> para confirmar tu visita ({submitted.modality}) el <strong>{submitted.date}</strong> en el Km 7 vía Yopal - Aguazul margen derecha.
            </p>
            <div className="confirm-summary">
              <div><span>Proyecto:</span><strong>Prados de Terranova — Lote 600 m²</strong></div>
              <div><span>Ubicación:</span><strong>Km 7 vía Yopal - Aguazul (a 300 m de la vía principal)</strong></div>
              <div><span>Servicios y Legalidad:</span><strong>Agua, Luz y Escritura Legal Individual</strong></div>
              <div><span>Informes Cel.:</span><strong>{PROJECT_INFO.phoneDisplay}</strong></div>
            </div>
            <div className="cta-row">
              <a
                href={PROJECT_INFO.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
              >
                📲 Escribir por WhatsApp ({PROJECT_INFO.phoneDisplay})
              </a>
              <button type="button" className="btn-ghost" onClick={() => setSubmitted(null)}>
                Modificar solicitud
              </button>
            </div>
          </div>
        ) : (
          <form className="contact-form" onSubmit={onSubmit} noValidate>
            <div className="config-summary-pill">
              📞 <strong>Atención directa e informes: Cel. {PROJECT_INFO.phoneDisplay}</strong> · Km 7 vía Yopal - Aguazul margen derecha (a 300 m de la vía principal) · Lotes de 600 m² con agua, luz y escrituras individuales.
            </div>

            <div className="field-row">
              <label>
                <span>Interés principal</span>
                <select value={house.id} onChange={(e) => selectHouse(e.target.value)}>
                  {HOUSES.map((h) => (
                    <option key={h.id} value={h.id}>
                      Lote 600 m² + Prototipo {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Modalidad de atención</span>
                <select
                  value={form.modality}
                  onChange={(e) => setForm({ ...form, modality: e.target.value })}
                >
                  <option value="presencial">Visita presencial en el loteo (Km 7)</option>
                  <option value="virtual">Asesoría telefónica / WhatsApp (311 514 8526)</option>
                </select>
              </label>
            </div>

            <div className="field-row">
              <label>
                <span>Nombre completo *</span>
                <input
                  type="text"
                  placeholder="Ej. Carlos Salamanca"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                {errors.name && <small className="field-err">{errors.name}</small>}
              </label>
              <label>
                <span>Correo electrónico *</span>
                <input
                  type="email"
                  placeholder="cliente@correo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <small className="field-err">{errors.email}</small>}
              </label>
            </div>

            <div className="field-row">
              <label>
                <span>Teléfono / WhatsApp *</span>
                <input
                  type="tel"
                  placeholder="Ej. 311 514 8526"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                {errors.phone && <small className="field-err">{errors.phone}</small>}
              </label>
              <label>
                <span>Fecha de visita *</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
                {errors.date && <small className="field-err">{errors.date}</small>}
              </label>
            </div>

            <label>
              <span>Lote de interés o consulta de financiación</span>
              <textarea
                rows={2}
                placeholder="Ej. Deseo información sobre lotes disponibles de 600 m², financiación directa y escrituras..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>

            <div className="cta-row">
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                Agendar Visita al Loteo
              </button>
              <a
                href={PROJECT_INFO.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ textDecoration: 'none' }}
              >
                📲 Llamar / WhatsApp {PROJECT_INFO.phoneDisplay}
              </a>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
