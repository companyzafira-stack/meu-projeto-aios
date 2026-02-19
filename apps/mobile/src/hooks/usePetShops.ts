import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PetShop {
  id: string;
  name: string;
  address: string;
  cover_photo: string | null;
  lat: number;
  lng: number;
  distance_km: number;
  avg_rating: number;
  review_count: number;
  min_price: number;
}

interface FallbackPetShop {
  id: string;
  name: string;
  address: string;
  cover_photo: string | null;
  lat: number;
  lng: number;
  avg_rating: number | null;
  total_bookings: number | null;
}

type SortBy = 'distance' | 'rating' | 'price';

export function usePetShops(
  latitude: number,
  longitude: number,
  searchTerm: string = '',
  sortBy: SortBy = 'distance'
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['petshops', latitude, longitude, searchTerm, sortBy],
    queryFn: async () => {
      // Fetch nearby pet shops using RPC function
      const { data: petshops, error: rpcError } = await supabase.rpc(
        'get_nearby_petshops',
        {
          user_lat: latitude,
          user_lng: longitude,
          radius_km: 50,
        }
      );

      if (rpcError) {
        // Fallback: fetch all active pet shops if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('petshops')
          .select('id, name, address, cover_photo, lat, lng, avg_rating, total_bookings')
          .eq('status', 'active')
          .limit(50);

        if (fallbackError) throw fallbackError;

        // Calculate distance manually in JS
        return (fallbackData || []).map((p: FallbackPetShop) => ({
          ...p,
          distance_km: calculateDistance(latitude, longitude, p.lat, p.lng),
          avg_rating: p.avg_rating || 0,
          review_count: p.total_bookings || 0,
          min_price: 50, // Default placeholder
        }));
      }

      return petshops || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: latitude !== 0 && longitude !== 0,
  });

  // Filter and sort results
  let processedData = (data || []) as PetShop[];

  // Filter by search term
  if (searchTerm) {
    processedData = processedData.filter((ps) =>
      ps.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort
  if (sortBy === 'distance') {
    processedData.sort((a, b) => a.distance_km - b.distance_km);
  } else if (sortBy === 'rating') {
    processedData.sort((a, b) => b.avg_rating - a.avg_rating);
  } else if (sortBy === 'price') {
    processedData.sort((a, b) => a.min_price - b.min_price);
  }

  return {
    petshops: processedData,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
