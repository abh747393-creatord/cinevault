import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '18+ Adult | CineVault',
  description: 'Mature content section for adult viewers.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
