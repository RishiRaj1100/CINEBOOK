// ============================================================
// lib/domain/seat-map.ts
// Pure seat map layout logic — NO Supabase
// ============================================================

import type { ShowSeat, SeatCell, SeatRow, SeatMapData } from './types';

/**
 * Build a 2D seat grid from show_seats (with joined seat data).
 * currentUserId is used to mark seats locked by the current user.
 */
export function buildSeatMap(
  showSeats: ShowSeat[],
  currentUserId?: string | null,
): SeatMapData {
  // Group seats by row_label
  const rowMap = new Map<string, SeatCell[]>();

  for (const ss of showSeats) {
    if (!ss.seat) continue;

    const cell: SeatCell = {
      showSeatId: ss.id,
      seatId: ss.seat_id,
      rowLabel: ss.seat.row_label,
      seatNumber: ss.seat.seat_number,
      seatType: ss.seat.seat_type,
      status: ss.status,
      price: ss.price,
      lockedByCurrentUser: !!(currentUserId && ss.locked_by === currentUserId),
      lockExpiresAt: ss.lock_expires_at,
    };

    const existing = rowMap.get(ss.seat.row_label) ?? [];
    existing.push(cell);
    rowMap.set(ss.seat.row_label, existing);
  }

  // Sort rows alphabetically, seats numerically within each row
  const sortedRowLabels = Array.from(rowMap.keys()).sort((a, b) => a.localeCompare(b));

  const rows: SeatRow[] = sortedRowLabels.map((rowLabel) => ({
    rowLabel,
    cells: (rowMap.get(rowLabel) ?? []).sort((a, b) => a.seatNumber - b.seatNumber),
  }));

  const totalSeats = showSeats.length;
  const bookedSeats = showSeats.filter((s) => s.status === 'booked').length;
  const lockedSeats = showSeats.filter((s) => s.status === 'locked').length;
  const availableSeats = showSeats.filter((s) => s.status === 'available').length;

  return { rows, totalSeats, availableSeats, lockedSeats, bookedSeats };
}

/**
 * Apply a real-time show_seats update to an existing seat map.
 * Used in the Realtime subscription handler to avoid full re-renders.
 */
export function applyRealtimeUpdate(
  prevSeats: ShowSeat[],
  updatedSeat: ShowSeat,
): ShowSeat[] {
  const idx = prevSeats.findIndex((s) => s.id === updatedSeat.id);
  if (idx === -1) return [...prevSeats, updatedSeat];
  const next = [...prevSeats];
  next[idx] = updatedSeat;
  return next;
}

/**
 * Format seat label for display: "A5", "C12", etc.
 */
export function formatSeatLabel(rowLabel: string, seatNumber: number): string {
  return `${rowLabel}${seatNumber}`;
}

/**
 * Get CSS color class for a seat cell based on status and selection state.
 */
export function getSeatColorClass(
  cell: SeatCell,
  isSelected: boolean,
): string {
  if (isSelected) return 'seat-selected';
  if (cell.lockedByCurrentUser) return 'seat-locked-own';

  switch (cell.status) {
    case 'booked': return 'seat-booked';
    case 'locked': return 'seat-locked-other';
    case 'available':
      switch (cell.seatType) {
        case 'recliner': return 'seat-recliner';
        case 'premium':  return 'seat-premium';
        default:         return 'seat-regular';
      }
  }
}
