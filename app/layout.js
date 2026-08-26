import './globals.css';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'VoteVault — The People\'s Online Voting Machine',
  description: 'Your Vote. One Ballot. One Voice. Secure elections with AI-verified counts, tamper-evident cryptographically signed ballots, one-vote enforcement, server-side timing, and live results.',
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
