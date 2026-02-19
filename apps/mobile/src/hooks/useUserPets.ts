import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export function useUserPets() {
  const { user } = useAuth();
  const [hasPets, setHasPets] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPets = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('pets')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) throw error;
        setHasPets((data?.length || 0) > 0);
      } catch (err) {
        console.error('Error checking pets:', err);
        setHasPets(false);
      } finally {
        setLoading(false);
      }
    };

    checkPets();
  }, [user?.id]);

  return { hasPets, loading };
}
