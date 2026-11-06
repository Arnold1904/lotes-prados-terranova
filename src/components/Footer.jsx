import { PROJECT_INFO } from '../data/houses';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <strong>PRADOS DE TERRANOVA</strong>
          <span>
            Lotes campestres en el Km 7 vía Yopal - Aguazul margen derecha, a 300 m de la vía principal · Área de 600 m² · Agua y Luz · Escrituras legales individuales
          </span>
        </div>
        <div className="footer-credit">
          Informes y Ventas:{' '}
          <a href={PROJECT_INFO.whatsappUrl} target="_blank" rel="noreferrer">
            <strong>Cel. {PROJECT_INFO.phoneDisplay}</strong>
          </a>
        </div>
      </div>
    </footer>
  );
}
