'use client';

import type { TimeSlot } from '../lib/slotGenerator';

interface SlotCellProps {
  slot: TimeSlot;
}

const SLOT_STYLES: Record<TimeSlot['status'], string> = {
  available: 'bg-green-100 text-green-700 border-green-200',
  booked: 'bg-blue-100 text-blue-700 border-blue-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
};

export function SlotCell({ slot }: SlotCellProps) {
  const remaining = Math.max(0, slot.maxConcurrent - slot.bookingCount);

  let statusLabel = 'Livre';

  if (slot.status === 'booked') {
    statusLabel = 'Lotado';
  }

  if (slot.status === 'blocked') {
    statusLabel = 'Bloqueado';
  }

  if (slot.status === 'available' && slot.bookingCount > 0) {
    statusLabel = `${remaining}/${slot.maxConcurrent}`;
  }

  return (
    <div
      className={`text-xs px-2 py-1 rounded border min-h-8 ${SLOT_STYLES[slot.status]}`}
      title={slot.status === 'blocked' && slot.blockReason ? slot.blockReason : undefined}
    >
      <div className="font-medium leading-tight">{slot.time}</div>
      <div className="leading-tight opacity-90">{statusLabel}</div>
    </div>
  );
}
