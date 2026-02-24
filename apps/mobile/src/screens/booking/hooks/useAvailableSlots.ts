import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AvailableSlot {
  slot_start: string;
  slot_end: string;
  available_spots: number;
}

export function useAvailableSlots(petshopId: string, date: string | null) {
  const { data, isLoading, error, refetch } = useQuery<AvailableSlot[], Error>({
    queryKey: ['available-slots', petshopId, date],
    queryFn: async () => {
      if (!date) {
        return [];
      }

      const { data: slots, error: slotsError } = await supabase.rpc(
        'get_available_slots',
        {
          p_petshop_id: petshopId,
          p_date: date,
        }
      );

      if (slotsError) {
        throw slotsError;
      }

      return (slots ?? []) as AvailableSlot[];
    },
    enabled: Boolean(petshopId) && Boolean(date),
    staleTime: 2 * 60 * 1000,
  });

  return {
    slots: data ?? [],
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
}
