
export type PosterSize = '21x30' | '30x40' | '50x70' | '70x100' | '50x50';

export interface PosterSizeOption {
  id: PosterSize;
  label: string;
  minPrice: number;
  dimensions: string;
  description: string;
}

export const POSTER_SIZES: PosterSizeOption[] = [
  { id: '21x30', label: 'A4', minPrice: 13, dimensions: '21 × 30 cm', description: 'A4 size' },
  { id: '30x40', label: '3:4', minPrice: 16, dimensions: '30 × 40 cm', description: '3:4 ratio' },
  { id: '50x70', label: 'Standard', minPrice: 20, dimensions: '50 × 70 cm', description: 'Standard size' },
  { id: '70x100', label: 'Large Standard', minPrice: 27, dimensions: '70 × 100 cm', description: 'Large standard size' },
  { id: '50x50', label: '1:1', minPrice: 10, dimensions: '50 × 50 cm', description: 'Square format' },
];

export const COMMISSION_RATE = 0.30; // Updated from 0.20 to 0.30 (30% commission)

export function calculateEarnings(price: number): { earnings: number; commission: number } {
  const commission = price * COMMISSION_RATE;
  const earnings = price - commission;
  return { earnings, commission };
}

export function getPosterSizeById(id: PosterSize): PosterSizeOption | undefined {
  return POSTER_SIZES.find(size => size.id === id);
}
