import React from 'react';

interface PartnerIconProps {
  size?: number;
  className?: string;
}

export default function PartnerIcon({ size = 64, className = '' }: PartnerIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 배경 원형 */}
      <circle cx="32" cy="32" r="30" fill="url(#gradient)" stroke="url(#glow)" strokeWidth="2"/>
      
      {/* 핸드셰이크 */}
      <g transform="translate(16, 28)">
        {/* 왼쪽 손 */}
        <path d="M8 12 L12 8 L16 8 L20 12 L20 16 L16 20 L12 20 L8 16 Z" fill="#1e40af" opacity="0.8"/>
        {/* 오른쪽 손 */}
        <path d="M24 12 L28 8 L32 8 L36 12 L36 16 L32 20 L28 20 L24 16 Z" fill="#1e40af" opacity="0.8"/>
        {/* 손가락 연결부 */}
        <path d="M18 14 L22 14 L22 18 L18 18 Z" fill="#1e40af" opacity="0.9"/>
      </g>
      
      {/* 방패와 체크마크 */}
      <g transform="translate(40, 12)">
        {/* 방패 */}
        <path d="M8 4 L16 2 L24 4 L22 20 L16 22 L10 20 Z" fill="#10b981"/>
        {/* 체크마크 */}
        <path d="M12 12 L14 14 L20 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      
      {/* 그라디언트 정의 */}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#1e3a8a', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#0f172a', stopOpacity: 1 }} />
        </linearGradient>
        
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.6 }} />
          <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
    </svg>
  );
}
