import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RawMultiPetDiscount {
  min_pets: number;
  discount_percent: number | string;
}

export interface MultiPetDiscountItem {
  min_pets: number;
  discount_percent: number;
}

function toNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useMultiPetDiscount(petshopId: string) {
  const { data, isLoading } = useQuery<MultiPetDiscountItem[], Error>({
    queryKey: ['multi-pet-discount', petshopId],
    queryFn: async () => {
      const { data: discountRows, error } = await supabase
        .from('petshop_multi_pet_discount')
        .select('min_pets, discount_percent')
        .eq('petshop_id', petshopId)
        .order('min_pets', { ascending: true });

      if (error) {
        throw error;
      }

      return ((discountRows ?? []) as RawMultiPetDiscount[]).map((discount) => ({
        min_pets: discount.min_pets,
        discount_percent: toNumber(discount.discount_percent),
      }));
    },
    staleTime: 10 * 60 * 1000,
    enabled: Boolean(petshopId),
  });

  const discounts = data ?? [];

  const getBestDiscount = (numPets: number) => {
    const applicableDiscounts = discounts.filter(
      (discount) => discount.min_pets <= numPets
    );

    if (applicableDiscounts.length === 0) {
      return null;
    }

    const bestDiscount = applicableDiscounts[applicableDiscounts.length - 1];

    return bestDiscount
      ? {
          percent: bestDiscount.discount_percent,
          minPets: bestDiscount.min_pets,
        }
      : null;
  };

  return {
    discounts,
    isLoading,
    getBestDiscount,
  };
}
