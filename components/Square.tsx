'use client';

import { motion } from 'framer-motion';
import { SquareProps } from '@/types';
import { formatPrice } from '@/utils/pricingUtils';
import clsx from 'clsx';

export default function Square({ 
  square, 
  isSelected, 
  isAvailable, 
  onClick, 
  campaign 
}: SquareProps) {
  const getSquareClass = () => {
    if (!isAvailable) return 'square-claimed';
    if (isSelected) return 'square-selected';
    return 'square-available';
  };

  const getSquareContent = () => {
    // Always show the square number, never show supporter names
    // Safe check for undefined values
    const squareNumber = square?.number ?? 0;
    return squareNumber.toString();
  };

  return (
    <motion.div
      className={clsx('square-item', getSquareClass())}
      onClick={isAvailable ? onClick : undefined}
      whileHover={isAvailable ? { scale: 1.05 } : {}}
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      animate={{
        scale: isSelected ? 1.1 : 1,
        backgroundColor: isSelected 
          ? 'rgba(59, 130, 246, 0.6)' // Blue for selected
          : isAvailable 
            ? 'rgba(255, 255, 255, 0.2)' // Light transparent for available
            : 'rgba(239, 68, 68, 0.6)' // Red for claimed
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
      title={`Square ${square.number} - ${formatPrice(square.value)}${
        square.claimed_by ? ` (Claimed)` : ''
      }`}
    >
      <div className="flex flex-col items-center justify-center text-center h-full">
        <span className="font-bold text-white text-sm drop-shadow-lg" style={{textShadow: '0 1px 3px rgba(0,0,0,0.8)'}}>
          {getSquareContent()}
        </span>
        <span className="text-xs font-semibold text-white drop-shadow-lg" style={{textShadow: '0 1px 3px rgba(0,0,0,0.8)'}}>
          {formatPrice(square.value)}
        </span>
      </div>
      
      {isSelected && (
        <motion.div
          className="absolute inset-0 border-2 border-white rounded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {square.claimed_by && (
        <motion.div
          className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full border border-red-400"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
        />
      )}
    </motion.div>
  );
}
