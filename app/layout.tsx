import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Powered Smart Grievance Redressal System | Government of Telangana',
  description: 'File and track your grievances with the Government of Telangana through our AI-powered smart grievance redressal system.',
  keywords: ['grievance', 'telangana', 'government', 'complaint', 'citizen services'],
  authors: [{ name: 'VNRVJIET - Department of Computer Science & Engineering' }],
  openGraph: {
    title: 'AI Powered Smart Grievance Redressal System',
    description: 'Government of Telangana - Smart Grievance Portal',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1a472a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
