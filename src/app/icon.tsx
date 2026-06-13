import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #22c55e, #15803d)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          color: 'white',
          fontSize: '20px',
          fontWeight: '800',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '-1px',
        }}
      >
        F
      </div>
    ),
    { ...size }
  )
}
