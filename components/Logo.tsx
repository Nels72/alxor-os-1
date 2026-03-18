
import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  textColor?: string;
  osColor?: string;
  lineColor?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "h-10", 
  textColor = "#121417", 
  osColor = "#6B7280", 
  lineColor = "#4F7CFF" 
}) => {
  return (
    <motion.svg 
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`${className} cursor-pointer origin-left`} 
      viewBox="0 0 620 120" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMinYMid meet"
    >
      {/* Lettres ALXOR avec un espacement ultra-large pour un look de marque de luxe/SaaS premium */}
      <text 
        x="20" 
        y="70" 
        fontFamily="Inter, sans-serif" 
        fontWeight="700" 
        fontSize="56" 
        letterSpacing="54" 
        fill={textColor}
      >
        ALXOR
      </text>
      
      {/* Ligne d'accent bleue : s'arrête précisément sous le 'R' de ALXOR */}
      <rect 
        x="20" 
        y="90" 
        width="465" 
        height="5" 
        fill={lineColor} 
        rx="2.5"
      />
      
      {/* OS lisible, décalé pour suivre l'extension du mot principal */}
      <text 
        x="500" 
        y="94" 
        fontFamily="Inter, sans-serif" 
        fontWeight="800" 
        fontSize="32" 
        fill={osColor}
      >
        OS
      </text>
    </motion.svg>
  );
};

export default Logo;
