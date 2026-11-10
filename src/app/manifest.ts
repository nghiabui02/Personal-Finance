import type { MetadataRoute } from 'next'

/**
 * Makes the app installable to a phone's home screen, where it opens without
 * browser chrome. Logging a spend is a several-times-a-day action; a tab in
 * Safari costs more taps than an icon does.
 *
 * `start_url` is the dashboard rather than `/`: the root only redirects by auth
 * state, and a launch that renders a redirect first flashes an empty screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finance',
    short_name: 'Finance',
    description: 'Personal finance manager',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f9fafb',
    theme_color: '#4f46e5',
    // The same mark the browser tab already uses, served by `app/icon.svg`.
    // One SVG covers every Android launcher size. Not declared `maskable`: the
    // mark fills its canvas and has no transparent margin for a launcher to
    // crop into, so a system shape would cut the ends off it.
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
