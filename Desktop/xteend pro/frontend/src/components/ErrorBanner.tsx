import { ReactNode } from 'react';

interface ErrorBannerProps {
  children: ReactNode;
}

const ErrorBanner = ({ children }: ErrorBannerProps) => (
  <div
    style={{
      background: '#fee2e2',
      color: '#991b1b',
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      border: '1px solid #fecaca'
    }}
  >
    {children}
  </div>
);

export default ErrorBanner;
