import { EffectComposer, N8AO, Bloom, ToneMapping, Vignette, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export default function Effects({ quality = 'high' }) {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <N8AO aoRadius={1.4} intensity={2.4} distanceFalloff={0.8} quality={quality === 'high' ? 'medium' : 'low'} halfRes />
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={1.1} luminanceSmoothing={0.25} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.5} />
      <SMAA />
    </EffectComposer>
  );
}
