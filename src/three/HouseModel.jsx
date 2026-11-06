import { useEffect } from 'react';
import { useStore } from '../store';
import { FRAME_COLORS } from '../data/houses';
import { useMaterials } from './materials';
import VillaSolaris from './houses/VillaSolaris';
import CasaAlameda from './houses/CasaAlameda';
import RefugioPinar from './houses/RefugioPinar';

// Para usar un GLB propio basta con añadir aquí un componente que haga <Model id="mi_casa" />
const COMPONENTS = { villa: VillaSolaris, alameda: CasaAlameda, pinar: RefugioPinar };

export default function HouseModel() {
  const m = useMaterials();
  const houseId = useStore((s) => s.houseId);
  const frameColor = useStore((s) => s.frameColor);

  useEffect(() => {
    m.frame.color.set(FRAME_COLORS[frameColor].color);
  }, [frameColor, m]);

  const House = COMPONENTS[houseId];
  return <House />;
}
