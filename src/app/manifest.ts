import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Centro Cristiano Casa del Rey Popayán',
    short_name: 'Casa del Rey',
    description: 'Sistema de gestión e información institucional',
    start_url: '/',
    display: 'standalone', // 👈 Para que se ejecute a pantalla completa sin barra de navegador
    background_color: '#006C69',
    theme_color: '#006C69',
    icons: [
      {
        src: '/Logo-Verde-sin-texto.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/Logo-Verde-sin-texto.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}