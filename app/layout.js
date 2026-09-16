import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Birthday Globe — never miss a birthday, anywhere on Earth',
  description: 'A global birthday calendar. Add your birthday, discover celebrations around the world on a 3D globe, follow friends and get reminders.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-[#F8F9FA] text-[#0F172A] antialiased selection:bg-[#10B981]/20 selection:text-[#047857]">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors toastOptions={{ style: { borderRadius: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', boxShadow: '0 10px 30px -5px rgba(15,23,42,0.08)' } }} />
      </body>
    </html>
  )
}
