import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Review, ReviewAuthor } from './usePetShopProfile';

export type ReviewSort = 'recent' | 'best' | 'worst';

interface RawReviewAuthor {
  display_name: string | null;
  avatar_url: string | null;
}

interface RawReview {
  id: string;
  tutor_id: string;
  rating: number;
  comment: string | null;
  petshop_response: string | null;
  response_date: string | null;
  created_at: string;
  profiles: RawReviewAuthor | RawReviewAuthor[] | null;
}

function normalizeAuthor(author: RawReviewAuthor | RawReviewAuthor[] | null): ReviewAuthor {
  const resolvedAuthor = Array.isArray(author) ? author[0] : author;

  return {
    display_name: resolvedAuthor?.display_name?.trim() || 'Tutor',
    avatar_url: resolvedAuthor?.avatar_url ?? null,
  };
}

function normalizeReviews(rows: RawReview[]): Review[] {
  return rows.map((row) => ({
    id: row.id,
    tutor_id: row.tutor_id,
    rating: row.rating,
    comment: row.comment,
    petshop_response: row.petshop_response,
    response_date: row.response_date,
    created_at: row.created_at,
    profiles: normalizeAuthor(row.profiles),
  }));
}

export function useReviews(
  petshopId: string,
  options?: { limit?: number; sort?: ReviewSort; enabled?: boolean }
) {
  const limit = options?.limit ?? 3;
  const sort = options?.sort ?? 'recent';
  const enabled = options?.enabled ?? true;

  const { data, isLoading, error, refetch } = useQuery<Review[], Error>({
    queryKey: ['reviews', petshopId, limit, sort],
    queryFn: async () => {
      let query = supabase
        .from('reviews')
        .select(
          'id, tutor_id, rating, comment, petshop_response, response_date, created_at, profiles:tutor_id(display_name, avatar_url)'
        )
        .eq('petshop_id', petshopId)
        .eq('is_hidden', false);

      if (sort === 'recent') {
        query = query.order('created_at', { ascending: false });
      } else if (sort === 'best') {
        query = query
          .order('rating', { ascending: false })
          .order('created_at', { ascending: false });
      } else {
        query = query
          .order('rating', { ascending: true })
          .order('created_at', { ascending: false });
      }

      const { data: reviewRows, error: reviewError } = await query.limit(limit);

      if (reviewError) {
        throw reviewError;
      }

      return normalizeReviews((reviewRows ?? []) as RawReview[]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(petshopId) && enabled,
  });

  return {
    reviews: data ?? [],
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
}

export function useReviewCount(petshopId: string) {
  const { data, isLoading } = useQuery<number, Error>({
    queryKey: ['review-count', petshopId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('petshop_id', petshopId)
        .eq('is_hidden', false);

      if (error) {
        throw error;
      }

      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(petshopId),
  });

  return {
    count: data ?? 0,
    isLoading,
  };
}
