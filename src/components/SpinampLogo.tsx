import React, { useState } from 'react';
import logoImg from '../assets/logo.png';

interface SpinampLogoProps {
  className?: string;
}

export const SpinampLogo: React.FC<SpinampLogoProps> = ({ className = "w-7 h-7 rounded-lg" }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`${className} bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center border border-amber-400/50 shadow-md shrink-0 overflow-hidden`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-black">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3" />
          <path d="M12 18v3" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={logoImg}
      alt="Spinamp Logo"
      className={`${className} object-cover border border-neutral-700 shadow-sm shrink-0`}
      onError={() => setHasError(true)}
    />
  );
};
