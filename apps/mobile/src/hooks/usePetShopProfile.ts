import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ServicePrice {
  id: string;
  size: string;
  price: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  is_addon: boolean;
  service_prices: ServicePrice[];
}

export interface ReviewAuthor {
  display_name: string;
  avatar_url: string | null;
}

export interface Review {
  id: string;
  tutor_id: string;
  rating: number;
  comment: string | null;
  petshop_response: string | null;
  response_date: string | null;
  created_at: string;
  profiles: ReviewAuthor;
}

export interface PetShopPhoto {
  id: string;
  photo_url: string;
  display_order: number;
}

export interface ScheduleInfo {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface PetShopProfile {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  cover_photo: string | null;
  avg_rating: number;
  lat: number;
  lng: number;
  services: Service[];
  reviews: Review[];
  petshop_photos: PetShopPhoto[];
  schedules: ScheduleInfo[];
}

interface RawServicePrice {
  id: string;
  size: string;
  price: number | string | null;
}

interface RawService {
  id: string;
  name: string;
  description: string | null;
  category: string;
  duration_minutes: number;
  is_addon: boolean;
  is_active: boolean;
  service_prices: RawServicePrice[] | null;
}

interface RawPetShopPhoto {
  id: string;
  photo_url: string;
  display_order: number | null;
}

interface RawScheduleInfo {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface RawPetShopProfile {
  id: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  cover_photo: string | null;
  avg_rating: number | string | null;
  lat: number | string;
  lng: number | string;
  petshop_photos: RawPetShopPhoto[] | null;
  services: RawService[] | null;
  schedules: RawScheduleInfo[] | null;
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function normalizeProfile(raw: RawPetShopProfile): PetShopProfile {
  const services = (raw.services ?? [])
    .filter((service) => service.is_active)
    .map<Service>((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      duration_minutes: service.duration_minutes,
      is_addon: service.is_addon,
      service_prices: (service.service_prices ?? []).map((price) => ({
        id: price.id,
        size: price.size,
        price: toNumber(price.price),
      })),
    }));

  const petshopPhotos = [...(raw.petshop_photos ?? [])]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map<PetShopPhoto>((photo) => ({
      id: photo.id,
      photo_url: photo.photo_url,
      display_order: photo.display_order ?? 0,
    }));

  const schedules = [...(raw.schedules ?? [])].sort(
    (a, b) => a.day_of_week - b.day_of_week
  );

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    address: raw.address,
    city: raw.city,
    state: raw.state,
    phone: raw.phone,
    cover_photo: raw.cover_photo,
    avg_rating: toNumber(raw.avg_rating),
    lat: toNumber(raw.lat),
    lng: toNumber(raw.lng),
    services,
    reviews: [],
    petshop_photos: petshopPhotos,
    schedules,
  };
}

export function usePetShopProfile(petshopId: string) {
  const { data, isLoading, error } = useQuery<PetShopProfile | null, Error>({
    queryKey: ['petshop-profile', petshopId],
    queryFn: async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('petshops')
        .select(
          `
            id,
            name,
            description,
            address,
            city,
            state,
            phone,
            cover_photo,
            avg_rating,
            lat,
            lng,
            petshop_photos(id, photo_url, display_order),
            services(id, name, description, category, duration_minutes, is_addon, is_active, service_prices(id, size, price)),
            schedules(day_of_week, start_time, end_time, is_active)
          `
        )
        .eq('id', petshopId)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        return null;
      }

      return normalizeProfile(profileData as RawPetShopProfile);
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(petshopId),
  });

  return {
    profile: data ?? null,
    isLoading,
    error: error ? error.message : null,
  };
}
