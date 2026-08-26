import './globals.css';
import { Toaster } from 'sonner';

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://votevault.app';
const OG_IMAGE = 'https://images.unsplash.com/photo-1583340806569-6da3d5ea9911?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200&h=630&fit=crop';
const DESCRIPTION = 'VoteVault is a 100% free, secure online voting & elections platform. Create elections, predict winners, cast one tamper-evident ballot, run AI-verified recounts, and view live results. Democracy is free — for the people, by the people.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'VoteVault — Free Secure Online Voting & Elections Platform',
    template: '%s · VoteVault',
  },
  description: DESCRIPTION,
  applicationName: 'VoteVault',
  keywords: [
    'online voting', 'free voting platform', 'secure elections', 'election software',
    'create an election', 'poll', 'referendum', 'ballot', 'prediction poll',
    'AI verified recount', 'tamper-evident voting', 'anonymous ballot', 'live results',
    'community voting', 'HOA voting', 'union elections', 'student government voting',
  ],
  authors: [{ name: 'VoteVault' }],
  creator: 'VoteVault',
  publisher: 'VoteVault',
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'VoteVault',
    title: 'VoteVault — Free Secure Online Voting & Elections Platform',
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'VoteVault — free secure online voting' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoteVault — Free Secure Online Voting & Elections',
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  category: 'technology',
};

export const viewport = {
  themeColor: '#0b1020',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'VoteVault',
      url: SITE_URL,
      description: DESCRIPTION,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'VoteVault',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: DESCRIPTION,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      </head>
      <body className="bg-black text-white antialiased">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
