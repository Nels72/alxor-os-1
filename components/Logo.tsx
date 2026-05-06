import React from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  className?: string;
  textColor?: string;
  osColor?: string;
  lineColor?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className = "h-12", 
  textColor = "#FFFFFF",
  osColor = "#E3DFFE",
  lineColor = "#4F7CFF"
}) => {
  return (
    <motion.svg
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`${className} cursor-pointer origin-left`} 
      // ViewBox élargie pour laisser respirer l'espacement et l'extension du trait
      viewBox="0 0 900 120" 
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMinYMid meet"
    >
      {/* "alxor" : minuscules, gras, espacement x1.5 (81px) */}
      <text
        x="20" 
        y="65" 
        fontFamily="Inter, sans-serif"
        fontWeight="700"
        fontSize="64" 
        letterSpacing="70" 
        fill={textColor}
        style={{ textTransform: 'lowercase' }}
      >
        alxor
      </text>

      {/* Trait : affiné (2px) et étiré de deux espaces après le 'r' */}
      <rect 
        x="20" 
        y="85" 
        width="600" 
        height="2" 
        fill={lineColor}
        rx="1"
      />

      {/* "OS" : Majuscules, fin (400), taille augmentée (48) */}
      <text
        x="630" 
        y="88" 
        fontFamily="Inter, sans-serif"
        fontWeight="400" 
        fontSize="48" 
        fill={osColor}
      >
        OS
      </text>
    </motion.svg>
  );
};

export default Logo;