import React from 'react';

interface MarqueeTextProps {
  text: string;
  className?: string;
  speed?: number; // duration in seconds
}

export const MarqueeText: React.FC<MarqueeTextProps> = ({ 
  text, 
  className = "text-white text-xs font-bold",
  speed = 12 
}) => {
  if (!text) return null;

  return (
    <div className="w-full overflow-hidden relative select-none" id="track-title-marquee-container">
      <div 
        className="flex whitespace-nowrap"
        style={{ width: 'max-content' }}
      >
        <span 
          className={`${className} inline-block pr-8 shrink-0`}
          style={{
            animation: `marquee-scroll ${speed}s linear infinite`,
          }}
        >
          {text}
        </span>
        <span 
          className={`${className} inline-block pr-8 shrink-0`}
          style={{
            animation: `marquee-scroll ${speed}s linear infinite`,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
};
