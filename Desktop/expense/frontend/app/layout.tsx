import React from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses with analytics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/login">Login</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
