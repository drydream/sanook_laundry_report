import './globals.css';

export const metadata = {
  title: 'สนุกซักฉะเชิงเทรา - รายงานการเงิน',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
