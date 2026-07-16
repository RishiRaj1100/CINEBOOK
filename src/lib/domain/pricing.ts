// ============================================================
// lib/domain/pricing.ts
// Pure price calculation logic — NO Supabase, easily unit-tested
// All values in paise (1 INR = 100 paise)
// ============================================================

import type { SeatType, SeatCell, BookingSummary } from './types';

/** Multiplier applied to base_price per seat type */
const SEAT_TYPE_MULTIPLIER: Record<SeatType, number> = {
  regular:  1.0,
  premium:  1.5,
  recliner: 2.0,
};

/** Convenience fee: 2.5% of subtotal */
const CONVENIENCE_FEE_RATE = 0.025;

/** GST on tickets: 18% */
const GST_RATE = 0.18;

/**
 * Calculate the price for a single seat given the base show price.
 * base_price is in paise, returns paise.
 */
export function calculateSeatPrice(basePrice: number, seatType: SeatType): number {
  return Math.round(basePrice * SEAT_TYPE_MULTIPLIER[seatType]);
}

/**
 * Build full booking summary from selected seats.
 * All amounts in paise.
 */
export function buildBookingSummary(selectedSeats: SeatCell[]): BookingSummary {
  const subtotal = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
  const convenienceFee = Math.round(subtotal * CONVENIENCE_FEE_RATE);
  const taxes = Math.round(subtotal * GST_RATE);
  const totalAmount = subtotal + convenienceFee + taxes;

  return { selectedSeats, subtotal, convenienceFee, taxes, totalAmount };
}

/**
 * Format paise to INR string for display.
 * e.g. 15000 → "₹150.00"
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rupees);
}

/**
 * Parse rupees string to paise integer.
 * e.g. "150" → 15000
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paisToRupees(paise: number): number {
  return paise / 100;
}
