import './globals.css'
import { DM_Sans, Fraunces } from 'next/font/google'
const sans = DM_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const serif = Fraunces({ subsets: ['latin'], variable: '--font-heading', display: 'swap' })
export const viewport = { themeColor: '#f5f0e5', width: 'device-width', initialScale: 1 }
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Birthday Globe — never miss a birthday, anywhere on Earth',
  description: 'A global birthday calendar. Add your birthday, discover celebrations around the world on a 3D globe, follow friends and get reminders.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`bg-background ${sans.variable} ${serif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <Toaster theme="light" position="top-center" toastOptions={{ style: { borderRadius: '4px', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', fontFamily: 'var(--font-body)' } }} />
      </body>
    </html>
  )
}
