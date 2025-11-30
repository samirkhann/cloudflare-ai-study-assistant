import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Study Assistant | Powered by Cloudflare Workers AI',
  description:
    'AI-powered study assistant using Cloudflare Workers AI, Durable Objects, and edge computing for fast, intelligent responses.',
  keywords: ['AI', 'Study Assistant', 'Cloudflare', 'Machine Learning', 'Education'],
  authors: [{ name: 'Samir Khan', url: 'https://github.com/samirkhann' }],
  openGraph: {
    title: 'AI Study Assistant',
    description: 'Get instant help with homework and study topics, powered by Cloudflare Workers AI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#050505] text-white antialiased">
        {children}
      </body>
    </html>
  );
}