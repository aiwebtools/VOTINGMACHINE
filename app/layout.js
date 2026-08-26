import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'VoteVault — Your Vote. One Ballot. One Voice.',
  description: 'Secure voting infrastructure with one-vote-per-election enforcement, controlled election timing, and transparent live results.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-white antialiased">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
