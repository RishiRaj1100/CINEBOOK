import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';

import { LocationProvider } from '@/components/providers/LocationProvider';

export const metadata: Metadata = {
  title: {
    default: 'CineBook — Movie Ticket Booking',
    template: '%s | CineBook',
  },
  description: 'Book movie tickets online for the latest blockbusters. Real-time seat selection, instant confirmation.',
  keywords: ['movie tickets', 'book tickets online', 'cinema', 'now showing'],
  openGraph: {
    title: 'CineBook — Movie Ticket Booking',
    description: 'Book movie tickets online for the latest blockbusters.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bebas+Neue&display=swap" rel="stylesheet" />
      </head>
      <body>
        <QueryProvider>
          <LocationProvider>
            <AuthProvider>
              <Navbar />
              <main className="min-h-screen">{children}</main>
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#1a1a2e',
                    color: '#f0f0f0',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  },
                  success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                  error:   { iconTheme: { primary: '#e50914', secondary: '#fff' } },
                }}
              />
            </AuthProvider>
          </LocationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
