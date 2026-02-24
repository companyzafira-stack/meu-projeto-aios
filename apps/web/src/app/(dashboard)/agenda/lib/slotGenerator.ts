import { Schedule } from '@/hooks/useSchedules';
import { ScheduleBlock } from '@/hooks/useScheduleBlocks';

export interface TimeSlot {
  time: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked';
  bookingCount: number;
  maxConcurrent: number;
  blockReason?: string;
}

interface Booking {
  start_time: string;
  end_time: string;
  status: string;
}

function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = normalizeTime(time).split(':');
  return Number(hours) * 60 + Number(minutes);
}

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (totalMinutes % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return timeIsBefore(startA, endB) && timeIsBefore(startB, endA);
}

export function generateSlotsForDate(
  date: string,
  schedule: Schedule | null,
  blocks: ScheduleBlock[],
  bookings: Booking[]
): TimeSlot[] {
  void date;

  if (!schedule || !schedule.is_active) {
    return [];
  }

  const start = normalizeTime(schedule.start_time);
  const end = normalizeTime(schedule.end_time);
  const duration = schedule.slot_duration_minutes;
  const maxConcurrent = Math.max(1, schedule.max_concurrent);

  if (!Number.isInteger(duration) || duration <= 0) {
    return [];
  }

  if (!timeIsBefore(start, end)) {
    return [];
  }

  const slots: TimeSlot[] = [];
  let current = start;

  while (timeIsBefore(current, end)) {
    const slotEnd = addMinutes(current, duration);

    if (!timeIsBefore(current, slotEnd) || timeIsBefore(end, slotEnd)) {
      break;
    }

    const overlappingBlock = blocks.find((block) => {
      if (block.start_time === null || block.end_time === null) {
        return true;
      }

      return timesOverlap(
        current,
        slotEnd,
        normalizeTime(block.start_time),
        normalizeTime(block.end_time)
      );
    });

    const bookingCount = bookings.filter((booking) =>
      timesOverlap(
        current,
        slotEnd,
        normalizeTime(booking.start_time),
        normalizeTime(booking.end_time)
      )
    ).length;

    if (overlappingBlock) {
      slots.push({
        time: current,
        endTime: slotEnd,
        status: 'blocked',
        bookingCount,
        maxConcurrent,
        blockReason: overlappingBlock.reason ?? undefined,
      });
    } else if (bookingCount >= maxConcurrent) {
      slots.push({
        time: current,
        endTime: slotEnd,
        status: 'booked',
        bookingCount,
        maxConcurrent,
      });
    } else {
      slots.push({
        time: current,
        endTime: slotEnd,
        status: 'available',
        bookingCount,
        maxConcurrent,
      });
    }

    current = slotEnd;
  }

  return slots;
}

export function getDayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDates(mondayDate: string): string[] {
  const base = new Date(`${mondayDate}T12:00:00`);
  const dates: string[] = [];

  for (let index = 0; index < 6; index += 1) {
    const current = new Date(base);
    current.setDate(base.getDate() + index);
    dates.push(toDateString(current));
  }

  return dates;
}

export function addMinutes(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export function timeIsBefore(a: string, b: string): boolean {
  return timeToMinutes(a) < timeToMinutes(b);
}
