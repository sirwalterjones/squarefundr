"use client";

import { motion } from "framer-motion";
import { SquareProps } from "@/types";
import { formatPrice } from "@/utils/pricingUtils";
import clsx from "clsx";

export default function Square({
  square,
  isSelected,
  isAvailable,
  onClick,
  campaign,
}: SquareProps) {
  // Debug logging for selected squares
  if (isSelected) {
    console.log(
      `Square ${square.number} (${square.row},${square.col}) is SELECTED`,
    );
  }

  const getSquareClass = () => {
    if (!isAvailable) return "square-claimed";
    if (isSelected) return "square-selected";
    return "square-available";
  };

  const getSquareContent = () => {
    // Always show the square number, never show supporter names
    // Safe check for undefined values
    const squareNumber = square?.number ?? 0;
    return squareNumber.toString();
  };

  return (
    <motion.div
      className="relative cursor-pointer flex items-center justify-center touch-manipulation"
      onClick={isAvailable ? onClick : undefined}
      whileHover={
        isAvailable ? { scale: 1.1, zIndex: 20 } : { scale: 1.05, zIndex: 20 }
      }
      whileTap={isAvailable ? { scale: 0.95 } : {}}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      title={`Square ${square.number} - ${formatPrice(square.value)}${square.claimed_by ? ` (Claimed)` : ""}`}
      initial={false}
      style={{
        backgroundColor: isSelected
          ? "rgba(59, 130, 246, 0.9)"
          : isAvailable
            ? "rgba(255, 255, 255, 0.2)"
            : "rgba(239, 68, 68, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        width: "100%",
        height: "100%",
        minWidth: "0", // Let grid control sizing
        minHeight: "0", // Let grid control sizing
        boxSizing: "border-box",
      }}
    >
      <div className="flex flex-col items-center justify-center text-center w-full h-full p-0.5">
        <span
          className="font-bold text-white leading-none"
          style={{
            textShadow: "0 1px 3px rgba(0,0,0,1)",
            fontSize: "clamp(8px, 1.2vw, 14px)", // Better balance for mobile
          }}
        >
          #{getSquareContent()}
        </span>
        <span
          className="font-medium text-white leading-none mt-0.5"
          style={{
            textShadow: "0 1px 3px rgba(0,0,0,1)",
            fontSize: "clamp(6px, 0.8vw, 10px)", // Better balance for mobile
          }}
        >
          {formatPrice(square.value)}
        </span>
      </div>

      {isSelected && (
        <motion.div
          className="absolute inset-0 border-2 border-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            boxShadow:
              "0 0 0 3px rgba(59, 130, 246, 1), inset 0 0 0 1px rgba(255,255,255,0.8)",
            zIndex: 10,
          }}
        />
      )}

      {/* Mobile-friendly selection indicator */}
      {isSelected && (
        <motion.div
          className="absolute -top-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400 }}
          style={{ zIndex: 15 }}
        >
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      )}

      {square.claimed_by && (
        <motion.div
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full border border-red-500"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{ zIndex: 5 }}
        />
      )}
    </motion.div>
  );
}
