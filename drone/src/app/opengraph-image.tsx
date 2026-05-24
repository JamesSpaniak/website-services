import { ImageResponse } from 'next/og';

const SITE_NAME = 'Drone Edge';

export const alt = `${SITE_NAME} — FAA certification & drone education`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0d0d0d',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: 72,
          paddingRight: 72,
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 600,
            color: '#8ea66a',
            letterSpacing: '0.02em',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            lineHeight: 1.1,
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 30,
            color: '#c9c9c9',
            marginTop: 20,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            lineHeight: 1.3,
          }}
        >
          FAA Part 107 & drone education
        </div>
      </div>
    ),
    { ...size },
  );
}
