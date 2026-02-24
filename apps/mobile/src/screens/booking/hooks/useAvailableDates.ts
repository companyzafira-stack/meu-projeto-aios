import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DateAvailability {
  date: string;
  dayLabel: string;
  dayNumber: string;
  monthLabel: string;
  hasSlots: boolean;
  isToday: boolean;
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
] as const;

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateNextDates(totalDays: number): string[] {
  return Array.from({ length: totalDays }, (_, offset) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return toLocalDateString(date);
  });
}

export function useAvailableDates(petshopId: string) {
  const next14Dates = useMemo(() => generateNextDates(14), []);

  const queries = useQueries({
    queries: next14Dates.map((date) => ({
      queryKey: ['available-slots-date-check', petshopId, date],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_petshop_id: petshopId,
          p_date: date,
        });

        if (error) {
          throw error;
        }

        return (data?.length ?? 0) > 0;
      },
      enabled: Boolean(petshopId),
      staleTime: 2 * 60 * 1000,
    })),
  });

  const dates: DateAvailability[] = next14Dates.map((date, index) => {
    const parsedDate = new Date(`${date}T12:00:00`);
    const query = queries[index];

    return {
      date,
      dayLabel: DAY_LABELS[parsedDate.getDay()],
      dayNumber: String(parsedDate.getDate()).padStart(2, '0'),
      monthLabel: MONTH_LABELS[parsedDate.getMonth()],
      hasSlots: query?.data ?? false,
      isToday: index === 0,
    };
  });

  const isLoading = queries.some((query) => query.isLoading);

  return {
    dates,
    isLoading,
  };
}
