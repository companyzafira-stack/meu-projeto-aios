import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: 'Cão' | 'Gato';
  breed: string;
  size: 'P' | 'M' | 'G' | 'GG';
  age_months: number | null;
  photo_url: string | null;
  created_at: string;
}

export function usePets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user's pets
  const fetchPets = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPets(data || []);
    } catch (err) {
      setError('Erro ao buscar pets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Create pet
  const createPet = async (petData: Omit<Pet, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;

    try {
      const { data, error: createError } = await supabase
        .from('pets')
        .insert({
          ...petData,
          user_id: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      setPets([data, ...pets]);
      return data;
    } catch (err) {
      setError('Erro ao criar pet');
      console.error(err);
      throw err;
    }
  };

  // Update pet
  const updatePet = async (petId: string, petData: Partial<Pet>) => {
    try {
      const { data, error: updateError } = await supabase
        .from('pets')
        .update(petData)
        .eq('id', petId)
        .select()
        .single();

      if (updateError) throw updateError;

      setPets(pets.map((p) => (p.id === petId ? data : p)));
      return data;
    } catch (err) {
      setError('Erro ao atualizar pet');
      console.error(err);
      throw err;
    }
  };

  // Delete pet
  const deletePet = async (petId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId);

      if (deleteError) throw deleteError;

      setPets(pets.filter((p) => p.id !== petId));
    } catch (err) {
      setError('Erro ao deletar pet');
      console.error(err);
      throw err;
    }
  };

  // Load pets on mount and when user changes
  useEffect(() => {
    fetchPets();
  }, [user?.id]);

  return {
    pets,
    loading,
    error,
    createPet,
    updatePet,
    deletePet,
    refetch: fetchPets,
  };
}
