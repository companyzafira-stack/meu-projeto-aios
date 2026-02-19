import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ServicePrice {
  id: string;
  service_id: string;
  size: 'P' | 'M' | 'G' | 'GG';
  price: number;
}

export interface Service {
  id: string;
  petshop_id: string;
  name: string;
  description: string | null;
  category: 'banho' | 'tosa' | 'combo' | 'addon';
  duration_minutes: number;
  is_addon: boolean;
  is_active: boolean;
  service_prices: ServicePrice[];
  created_at: string;
}

export interface MultiPetDiscount {
  id: string;
  petshop_id: string;
  min_pets: number;
  discount_percent: number;
}

export function useServices(petshopId: string) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchServices = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select('*, service_prices(*)')
        .eq('petshop_id', petshopId)
        .order('category', { ascending: true });

      if (fetchError) throw fetchError;
      setServices(data || []);
    } catch (err) {
      setError('Erro ao buscar serviços');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createService = async (serviceData: Omit<Service, 'id' | 'petshop_id' | 'created_at' | 'service_prices'>, prices: { size: 'P' | 'M' | 'G' | 'GG'; price: number }[]) => {
    try {
      // Insert service
      const { data: newService, error: serviceError } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          petshop_id: petshopId,
        })
        .select()
        .single();

      if (serviceError) throw serviceError;

      // Insert prices
      if (prices.length > 0) {
        const priceRows = prices.map((p) => ({
          service_id: newService.id,
          size: p.size,
          price: Math.round(p.price * 100), // Store in cents
        }));

        const { error: priceError } = await supabase
          .from('service_prices')
          .insert(priceRows);

        if (priceError) throw priceError;
      }

      await fetchServices();
      return newService;
    } catch (err) {
      setError('Erro ao criar serviço');
      console.error(err);
      throw err;
    }
  };

  const updateService = async (serviceId: string, serviceData: Partial<Service>, prices?: { size: 'P' | 'M' | 'G' | 'GG'; price: number }[]) => {
    try {
      const { data: updated, error: updateError } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', serviceId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update prices if provided
      if (prices && prices.length > 0) {
        // Delete old prices
        await supabase.from('service_prices').delete().eq('service_id', serviceId);

        // Insert new prices
        const priceRows = prices.map((p) => ({
          service_id: serviceId,
          size: p.size,
          price: Math.round(p.price * 100),
        }));

        const { error: priceError } = await supabase
          .from('service_prices')
          .insert(priceRows);

        if (priceError) throw priceError;
      }

      await fetchServices();
      return updated;
    } catch (err) {
      setError('Erro ao atualizar serviço');
      console.error(err);
      throw err;
    }
  };

  const toggleService = async (serviceId: string, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase
        .from('services')
        .update({ is_active: isActive })
        .eq('id', serviceId);

      if (updateError) throw updateError;

      await fetchServices();
    } catch (err) {
      setError('Erro ao atualizar status do serviço');
      console.error(err);
      throw err;
    }
  };

  const deleteService = async (serviceId: string) => {
    try {
      // Check if service has future bookings
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('service_id', serviceId)
        .gt('booking_date', new Date().toISOString());

      if ((count || 0) > 0) {
        throw new Error('Não é possível deletar um serviço com agendamentos futuros');
      }

      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (deleteError) throw deleteError;

      await fetchServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar serviço');
      console.error(err);
      throw err;
    }
  };

  useEffect(() => {
    if (petshopId) {
      fetchServices();
    }
  }, [petshopId]);

  return {
    services,
    loading,
    error,
    createService,
    updateService,
    toggleService,
    deleteService,
    refetch: fetchServices,
  };
}
