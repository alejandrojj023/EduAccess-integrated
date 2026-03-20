import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const nunito = Nunito({ 
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito"
});

export const metadata: Metadata = {
  title: 'EduAccess - Plataforma Educativa Accesible',
  description: 'Plataforma educativa accesible para estudiantes de primero a tercer grado con baja visión y TPAC. Incluye lectura en voz alta, alto contraste y actividades adaptadas.',
  keywords: ['educación accesible', 'plataforma educativa', 'baja visión', 'TPAC', 'aprendizaje inclusivo', 'primaria', 'lectura en voz alta'],
  authors: [{ name: 'EduAccess' }],
  robots: { index: false, follow: false }, // SPA — no indexar hasta tener SSR
  openGraph: {
    title: 'EduAccess - Educación Accesible',
    description: 'Plataforma educativa con soporte de accesibilidad para estudiantes con baja visión y TPAC.',
    type: 'website',
    locale: 'es_MX',
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)'  },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 2,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
