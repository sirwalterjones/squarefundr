'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Square from './Square';
import { Campaign, Square as SquareType, SelectedSquare } from '@/types';
import { calculateSquarePrice } from '@/utils/pricingUtils';

interface GridOverlayProps {
  campaign: Campaign;
  squares: SquareType[];
  selectedSquares: SelectedSquare[];
  onSquareSelect: (square: SelectedSquare) => void;
  onSquareDeselect: (square: SelectedSquare) => void;
  imageUrl: string;
}

export default function GridOverlay({
  campaign,
  squares,
  selectedSquares,
  onSquareSelect,
  onSquareDeselect,
  imageUrl
}: GridOverlayProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const isSquareSelected = (row: number, col: number) => {
    return selectedSquares.some(s => s.row === row && s.col === col);
  };

  const isSquareAvailable = (square: SquareType) => {
    return !square.claimed_by && square.payment_status !== 'completed';
  };

  const handleSquareClick = (square: SquareType) => {
    if (!isSquareAvailable(square)) return;

    const selectedSquare: SelectedSquare = {
      row: square.row,
      col: square.col,
      number: square.number,
      value: square.value
    };

    if (isSquareSelected(square.row, square.col)) {
      onSquareDeselect(selectedSquare);
    } else {
      onSquareSelect(selectedSquare);
    }
  };

  const gridStyle = {
    gridTemplateColumns: `repeat(${campaign.columns}, 1fr)`,
    gridTemplateRows: `repeat(${campaign.rows}, 1fr)`,
  };

  return (
    <div className="image-overlay">
      <img
        src={imageUrl}
        alt={campaign.title}
        className="w-full h-auto rounded-lg"
        onLoad={() => setImageLoaded(true)}
      />
      
      {imageLoaded && (
        <motion.div
          className="grid-overlay grid-responsive"
          style={gridStyle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {squares.map((square) => (
            <Square
              key={square.id}
              square={square}
              isSelected={isSquareSelected(square.row, square.col)}
              isAvailable={isSquareAvailable(square)}
              onClick={() => handleSquareClick(square)}
              campaign={campaign}
            />
          ))}
        </motion.div>
      )}
      
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-gray-500">Loading image...</div>
        </div>
      )}
    </div>
  );
}


