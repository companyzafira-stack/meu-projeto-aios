'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Schedule } from '@/hooks/useSchedules';
import type { ScheduleBlock } from '@/hooks/useScheduleBlocks';
import {
  generateSlotsForDate,
  getDayOfWeek,
  getWeekDates,
} from '../lib/slotGenerator';
import { SlotCell } from './SlotCell';

interface CalendarBooking {
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface WeekCalendarProps {
  schedules: Schedule[];
  blocks: ScheduleBlock[];
  bookings: CalendarBooking[];
  weekStart: string;
  loading?: boolean;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
}

const ACTIVE_BOOKING_STATUSES = ['pending_payment', 'confirmed', 'in_progress'];
const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

function formatDateShort(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) {
    return date;
  }

  return `${day}/${month}`;
}

export function WeekCalendar({
  schedules,
  blocks,
  bookings,
  weekStart,
  loading = false,
  onPreviousWeek,
  onNextWeek,
}: WeekCalendarProps) {
  const weekDates = getWeekDates(weekStart);
  const activeBookings = bookings.filter((booking) =>
    ACTIVE_BOOKING_STATUSES.includes(booking.status)
  );

  const columns = weekDates.map((date) => {
    const dayOfWeek = getDayOfWeek(date);
    const schedule =
      schedules.find((item) => item.day_of_week === dayOfWeek) ?? null;
    const dayBlocks = blocks.filter((block) => block.block_date === date);
    const dayBookings = activeBookings.filter(
      (booking) => booking.booking_date === date
    );
    const slots = generateSlotsForDate(date, schedule, dayBlocks, dayBookings);

    return {
      date,
      dayOfWeek,
      schedule,
      slots,
    };
  });

  return (
    <section className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4 border-b bg-gray-50">
        <button
          type="button"
          onClick={onPreviousWeek}
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!onPreviousWeek}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-500">Calendário semanal</p>
          <p className="font-semibold text-gray-900">Semana de {formatDateShort(weekStart)}</p>
        </div>

        <button
          type="button"
          onClick={onNextWeek}
          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!onNextWeek}
          aria-label="Próxima semana"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="p-4 border-b bg-white">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-green-200 bg-green-100 text-green-700">
            Livre
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-100 text-blue-700">
            Lotado
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded border border-red-200 bg-red-100 text-red-700">
            Bloqueado
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px] grid grid-cols-6 gap-4 p-4">
          {columns.map((column) => (
            <div key={column.date} className="rounded-lg border border-gray-200 bg-gray-50">
              <div className="px-3 py-2 border-b border-gray-200 bg-white rounded-t-lg">
                <p className="text-sm font-semibold text-gray-900">
                  {WEEKDAY_SHORT_LABELS[column.dayOfWeek]} {formatDateShort(column.date)}
                </p>
                <p className="text-xs text-gray-500">
                  {column.schedule?.is_active ? 'Aberto' : 'Fechado'}
                </p>
              </div>

              <div className="p-2 space-y-1 min-h-[240px]">
                {loading ? (
                  <div className="text-sm text-gray-500 py-2">Carregando slots...</div>
                ) : column.slots.length === 0 ? (
                  <div className="h-full min-h-[80px] rounded border border-dashed border-gray-300 bg-gray-100 text-gray-500 text-sm flex items-center justify-center">
                    Fechado
                  </div>
                ) : (
                  column.slots.map((slot) => (
                    <SlotCell key={`${column.date}-${slot.time}`} slot={slot} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
