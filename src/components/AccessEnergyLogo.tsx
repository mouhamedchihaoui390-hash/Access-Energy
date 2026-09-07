import React from 'react';

interface LogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export const AccessEnergyLogo: React.FC<LogoProps> = ({
  className = 'h-16 w-auto',
  width,
  height,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 150"
      className={className}
      style={{ width: width || undefined, height: height || undefined }}
      fill="none"
    >
      {/* Left Circuit & A Emblem */}
      <g transform="translate(10, 5)">
        {/* Circuit lines left */}
        <path d="M 40 45 L 15 45 M 15 45 L 8 45" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="8" cy="45" r="3.5" fill="#f97316" />

        <path d="M 32 65 L 10 65" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="8" cy="65" r="3.5" fill="#f97316" />

        <path d="M 38 85 L 18 85" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="16" cy="85" r="3.5" fill="#f97316" />

        {/* Circuit lines right */}
        <path d="M 100 45 L 125 45" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="127" cy="45" r="3.5" fill="#f97316" />

        <path d="M 105 65 L 132 65" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="134" cy="65" r="3.5" fill="#f97316" />

        <path d="M 98 85 L 122 85" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="124" cy="85" r="3.5" fill="#f97316" />

        {/* Circular Split Arc */}
        <path d="M 35 32 A 50 50 0 0 1 105 32" stroke="#0284c7" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M 22 55 A 50 50 0 0 1 35 32" stroke="#0284c7" strokeWidth="4.5" strokeLinecap="round" fill="none" />

        <path d="M 118 78 A 50 50 0 0 1 68 118" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M 68 118 A 50 50 0 0 1 30 102" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round" fill="none" />

        {/* Stylized Dark Navy 'A' Frame */}
        <path d="M 68 14 L 32 108 L 47 108 L 68 45 L 75 62 L 62 62 L 58 73 L 79 73 L 88 100 L 98 108 L 84 108 Z" fill="#0f172a" />
        <path d="M 68 14 L 102 108 L 87 108 L 68 45 Z" fill="#1e293b" />

        {/* Orange / Amber Lightning Bolt */}
        <polygon points="69,32 57,68 68,68 61,98 80,58 69,58" fill="#f59e0b" />
        <polygon points="69,32 62,64 70,64 63,94 77,59 69,59" fill="#ea580c" />

        <path d="M 88 84 L 98 108 L 86 108 Z" fill="#64748b" />
      </g>

      {/* Typography: ACCESS ENERGY */}
      <g transform="translate(165, 20)">
        <text x="0" y="55" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="54" fill="#0f172a" letterSpacing="3">
          ACC<tspan fill="#0f172a">E</tspan>SS
        </text>
        {/* Green Accent Bar on the upper line of E */}
        <rect x="110" y="21" width="30" height="7" rx="3.5" fill="#16a34a" />

        {/* "ENERGY" in Orange with wide spacing */}
        <text x="5" y="90" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="28" fill="#ea580c" letterSpacing="14">
          ENERGY
        </text>

        {/* Subtitle: - VOTRE ÉNERGIE NOTRE VISION DU FUTUR - */}
        <text x="5" y="112" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="700" fontSize="10.5" fill="#64748b" letterSpacing="2.5">
          - VOTRE ÉNERGIE NOTRE VISION DU FUTUR -
        </text>
      </g>
    </svg>
  );
};
