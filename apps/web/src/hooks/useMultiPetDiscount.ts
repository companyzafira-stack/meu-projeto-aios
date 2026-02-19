import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface MultiPetDiscount {
  id: string;
  petshop_id: string;
  min_pets: number;
  discount_percent: number;
}

export function useMultiPetDiscount(petshopId: string) {
  const [discounts, setDiscounts] = useState<MultiPetDiscount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDiscounts = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('petshop_multi_pet_discount')
        .select('*')
        .eq('petshop_id', petshopId)
        .order('min_pets', { ascending: true });

      if (fetchError) throw fetchError;
      setDiscounts(data || []);
    } catch (err) {
      setError('Erro ao buscar descontos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const upsertDiscount = async (minPets: number, discountPercent: number) => {
    try {
      const existingDiscount = discounts.find((d) => d.min_pets === minPets);

      if (existingDiscount) {
        const { error: updateError } = await supabase
          .from('petshop_multi_pet_discount')
          .update({ discount_percent: discountPercent })
          .eq('id', existingDiscount.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('petshop_multi_pet_discount')
          .insert({
            petshop_id: petshopId,
            min_pets: minPets,
            discount_percent: discountPercent,
          });

        if (insertError) throw insertError;
      }

      await fetchDiscounts();
    } catch (err) {
      setError('Erro ao salvar desconto');
      console.error(err);
      throw err;
    }
  };

  const deleteDiscount = async (discountId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('petshop_multi_pet_discount')
        .delete()
        .eq('id', discountId);

      if (deleteError) throw deleteError;

      await fetchDiscounts();
    } catch (err) {
      setError('Erro ao deletar desconto');
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (petshopId) {
      fetchDiscounts();
    }
  }, [petshopId]);

  return {
    discounts,
    loading,
    error,
    upsertDiscount,
    deleteDiscount,
    refetch: fetchDiscounts,
  };
}
