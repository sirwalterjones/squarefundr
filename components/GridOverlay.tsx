"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Square from "./Square";
import { Campaign, Square as SquareType, SelectedSquare } from "@/types";
import { calculateSquarePrice } from "@/utils/pricingUtils";

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
  imageUrl,
}: GridOverlayProps) {
  const [imageLoaded, setImageLoaded] = useState(true);
  const [imageError, setImageError] = useState(false);

  const isSquareSelected = (row: number, col: number) => {
    const isSelected = selectedSquares.some(
      (s) => s.row === row && s.col === col,
    );
    // Debug logging for selection state
    if (selectedSquares.length > 0) {
      console.log(`Checking square ${row},${col}: isSelected=${isSelected}`, {
        selectedSquares: selectedSquares.map((s) => `${s.row},${s.col}`),
        checkingSquare: `${row},${col}`,
      });
    }
    return isSelected;
  };

  const isSquareAvailable = (square: SquareType) => {
    // A square is available if:
    // 1. It has no claimed_by value (null or undefined)
    // 2. AND payment_status is not "completed"
    // 3. AND claimed_by doesn't start with "temp_" (temporary reservations)
    const isNotClaimed = !square.claimed_by || square.claimed_by === null;
    const isNotCompleted = square.payment_status !== "completed";
    const isNotTempReserved = !square.claimed_by?.startsWith("temp_");

    const available = isNotClaimed && isNotCompleted && isNotTempReserved;

    // Debug logging for claimed squares
    if (!available) {
      console.log(`Square ${square.number} is NOT available:`, {
        claimed_by: square.claimed_by,
        payment_status: square.payment_status,
        donor_name: square.donor_name,
        payment_type: square.payment_type,
        claimed_at: square.claimed_at,
      });
    }

    return available;
  };

  const handleSquareClick = (
    row: number,
    col: number,
    number: number,
    value: number,
    isAvailable: boolean,
  ) => {
    if (!isAvailable) return;

    const selectedSquare: SelectedSquare = {
      row,
      col,
      number,
      value,
    };

    console.log(`Square clicked: ${row},${col} (number: ${number})`, {
      currentlySelected: isSquareSelected(row, col),
      selectedSquaresCount: selectedSquares.length,
      selectedSquaresList: selectedSquares.map((s) => `${s.row},${s.col}`),
    });

    // Multi-select functionality - toggle individual squares
    if (isSquareSelected(row, col)) {
      console.log(`Deselecting square ${row},${col}`);
      onSquareDeselect(selectedSquare);
    } else {
      console.log(`Selecting square ${row},${col}`);
      onSquareSelect(selectedSquare);
    }
  };

  // Calculate total squares and ensure we have the right grid dimensions
  const totalSquares = campaign.rows * campaign.columns;

  // CRITICAL: Ensure we always render the correct number of squares
  // This should NEVER be less than the campaign configuration
  if (totalSquares <= 0) {
    console.error("Invalid campaign configuration:", {
      rows: campaign.rows,
      columns: campaign.columns,
      totalSquares,
      campaignId: campaign.id,
    });
    return (
      <div className="relative w-full p-8 text-center bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: Invalid campaign configuration</p>
        <p className="text-sm text-red-500">
          Rows: {campaign.rows}, Columns: {campaign.columns}
        </p>
      </div>
    );
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${campaign.columns}, 1fr)`,
    gridTemplateRows: `repeat(${campaign.rows}, 1fr)`,
    width: "100%",
    height: "100%",
    minHeight: "400px",
  };

  // Debug logging
  console.log("GridOverlay Debug:", {
    campaignRows: campaign.rows,
    campaignColumns: campaign.columns,
    totalSquares,
    squaresDataLength: squares.length,
    campaignId: campaign.id,
    campaignTitle: campaign.title,
    pricingType: campaign.pricing_type,
    priceData: campaign.price_data,
  });

  // Additional debug: log first few squares from database
  console.log("First 5 squares from database:", squares.slice(0, 5));

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div 
        className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
        style={{
          touchAction: 'pinch-zoom', // Allow pinch-to-zoom on mobile
          // Maintain aspect ratio but don't force height
        }}
      >
        <img
          src={imageUrl}
          alt={campaign.title}
          className="w-full h-auto block"
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
          onError={() => {
            setImageError(true);
            setImageLoaded(true); // Still show grid even if image fails
          }}
          style={{ display: "block" }}
        />

        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none" />

        <motion.div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${campaign.columns}, 1fr)`,
            gridTemplateRows: `repeat(${campaign.rows}, 1fr)`,
            width: "100%",
            height: "100%",
            gap: "1px", // Keep original gap for better fit
            padding: "2px", // Minimal padding
            pointerEvents: "auto",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {Array.from({ length: totalSquares }, (_, index) => {
            const row = Math.floor(index / campaign.columns);
            const col = index % campaign.columns;
            const squareNumber = index + 1;

            // Find existing square data - try multiple matching strategies
            let existingSquare = squares.find(
              (s) => s.row === row && s.col === col,
            );

            // Fallback: try to find by number if row/col matching fails
            if (!existingSquare) {
              existingSquare = squares.find((s) => s.number === squareNumber);
            }

            // Calculate square value using the updated pricing utility
            // Force recalculation by using current campaign data
            const squareValue = calculateSquarePrice(
              row,
              col,
              squareNumber,
              campaign.pricing_type,
              campaign.price_data,
            );

            // Override existing square value with calculated value to ensure display updates
            const displayValue = squareValue;

            // Determine availability
            const isAvailable = existingSquare
              ? !existingSquare.claimed_by &&
                existingSquare.payment_status !== "completed"
              : true;

            // Create square object (either existing or placeholder)
            // Always use the calculated value to ensure pricing updates are reflected
            const squareData = existingSquare
              ? {
                  ...existingSquare,
                  value: displayValue, // Override with calculated value
                }
              : {
                  id: `square-${campaign.id}-${row}-${col}`,
                  campaign_id: campaign.id,
                  row,
                  col,
                  number: squareNumber,
                  value: displayValue,
                  claimed_by: undefined,
                  donor_name: undefined,
                  payment_status: "pending" as const,
                  payment_type: "stripe" as const,
                  claimed_at: undefined,
                };

            // Debug log for first few squares and grid position
            if (index < 10) {
              console.log(`Square ${index + 1}:`, {
                row,
                col,
                squareNumber,
                squareValue,
                existingSquare: !!existingSquare,
                gridPosition: `${row + 1}/${col + 1}`,
                isAvailable,
              });
            }

            // Debug: Log if we're at the boundary of expected squares
            if (index === totalSquares - 1) {
              console.log(`Last square (${totalSquares}):`, {
                row,
                col,
                squareNumber,
                squareValue,
                existingSquare: !!existingSquare,
                gridPosition: `${row + 1}/${col + 1}`,
              });
            }

            // Additional debug: Log every 10th square to track grid progression
            if (index % 10 === 0 && index > 0) {
              console.log(`Square ${index + 1} (every 10th):`, {
                row,
                col,
                squareNumber,
                gridPosition: `${row + 1}/${col + 1}`,
              });
            }

            const isSelected = isSquareSelected(row, col);

            // Debug logging for rendering
            if (index < 5 || isSelected) {
              console.log(`Rendering square ${index + 1} (${row},${col}):`, {
                isSelected,
                isAvailable,
                squareNumber,
                selectedSquaresCount: selectedSquares.length,
              });
            }

            return (
              <Square
                key={`${campaign.id}-${row}-${col}`}
                square={squareData}
                isSelected={isSelected}
                isAvailable={isAvailable}
                onClick={() =>
                  handleSquareClick(
                    row,
                    col,
                    squareNumber,
                    displayValue,
                    isAvailable,
                  )
                }
                campaign={campaign}
              />
            );
          })}
        </motion.div>

        {imageError && (
          <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-300 rounded-lg flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">{campaign.title}</p>
              <p className="text-gray-500 text-sm mt-2">
                Image temporarily unavailable
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
