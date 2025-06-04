import { PriceData, PricingType } from '@/types';

export function calculateSquarePrice(
  row: number,
  column: number,
  number: number,
  pricingType: PricingType,
  priceData: PriceData
): number {
  switch (pricingType) {
    case 'fixed':
      return priceData.fixed || 0;
    
    case 'sequential':
      if (priceData.sequential) {
        return priceData.sequential.start + (number - 1) * priceData.sequential.increment;
      }
      return 0;
    
    case 'manual':
      if (priceData.manual) {
        const key = `${row},${column}`;
        return priceData.manual[key] || 0;
      }
      return 0;
    
    default:
      return 0;
  }
}

export function calculateTotalPrice(
  squares: Array<{ row: number; column: number; number: number }>,
  pricingType: PricingType,
  priceData: PriceData
): number {
  return squares.reduce((total, square) => {
    return total + calculateSquarePrice(square.row, square.column, square.number, pricingType, priceData);
  }, 0);
}

export function generateSquareNumbers(rows: number, columns: number): number[][] {
  const grid: number[][] = [];
  let currentNumber = 1;
  
  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < columns; col++) {
      grid[row][col] = currentNumber;
      currentNumber++;
    }
  }
  
  return grid;
}

export function validatePriceData(pricingType: PricingType, priceData: PriceData): boolean {
  switch (pricingType) {
    case 'fixed':
      return typeof priceData.fixed === 'number' && priceData.fixed > 0;
    
    case 'sequential':
      return !!(
        priceData.sequential &&
        typeof priceData.sequential.start === 'number' &&
        typeof priceData.sequential.increment === 'number' &&
        priceData.sequential.start > 0 &&
        priceData.sequential.increment >= 0
      );
    
    case 'manual':
      return !!(
        priceData.manual &&
        Object.keys(priceData.manual).length > 0 &&
        Object.values(priceData.manual).every(price => typeof price === 'number' && price > 0)
      );
    
    default:
      return false;
  }
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function getGridDimensions(totalSquares: number): { rows: number; columns: number } {
  // Find the closest square dimensions
  const sqrt = Math.sqrt(totalSquares);
  const rows = Math.ceil(sqrt);
  const columns = Math.ceil(totalSquares / rows);
  
  return { rows, columns };
}

export function isValidGridSize(rows: number, columns: number): boolean {
  return (
    rows > 0 &&
    columns > 0 &&
    rows <= 50 && // Reasonable limits
    columns <= 50 &&
    rows * columns <= 1000 // Maximum 1000 squares
  );
}


