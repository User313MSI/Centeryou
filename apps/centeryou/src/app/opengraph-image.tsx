import { ImageResponse } from 'next/og';
import { colors } from '../../design/tokens';
import { SITE_NAME, SLOGAN } from '../lib/site';

// Runtime edge : les assets (police, wasm) sont embarqués, aucune lecture disque —
// le prerender fonctionne ainsi sur toutes les plateformes (Windows inclus), où le
// runtime node de next/og échoue (fileURLToPath sur un chemin Windows).
export const runtime = 'edge';

export const alt = `${SITE_NAME} — ${SLOGAN}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
          gap: 28,
        }}
      >
        <svg width="150" height="150" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="19" fill={colors.primary} />
          <path
            d="M10.5 20c2.2-4.4 4.4-4.4 6.6 0s4.4 4.4 6.6 0 4.4-4.4 6.3 0"
            fill="none"
            stroke={colors.voice}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: '-0.03em', color: colors.ink }}>{SITE_NAME}</div>
        <div style={{ fontSize: 42, fontWeight: 600, color: colors.textSecondary }}>{SLOGAN}</div>
      </div>
    ),
    { ...size },
  );
}
