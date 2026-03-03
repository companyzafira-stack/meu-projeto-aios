# IPET-016 SPEC — Review & Rating System (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. IPET-001 to IPET-015 are implemented. This spec covers IPET-016: review system where tutors rate pet shops after completed bookings, pet shops respond, and basic moderation with profanity filter.

**Tech stack (web):** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Supabase at `@/lib/supabase`, Lucide React icons.

**Tech stack (mobile):** Expo 51, React Native 0.74, TypeScript, TanStack React Query 5, Supabase JS 2.45.

**Shared package:** `packages/shared/src/` — shared utilities used by both web and mobile.

**Existing:** `reviews` table already exists with all needed columns. `AllReviewsScreen.tsx` already exists from IPET-009 (viewing reviews). This spec adds **writing** reviews + dashboard management.

## Existing Database Schema (no new migrations needed for reviews table)

```sql
-- reviews (already exists)
CREATE TABLE public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tutor_id UUID REFERENCES public.profiles(id) NOT NULL,
  petshop_id UUID REFERENCES public.petshops(id) NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
  comment TEXT,
  petshop_response TEXT,
  response_date TIMESTAMPTZ,
  is_reported BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- petshops.avg_rating (already exists, DECIMAL(3,2) DEFAULT 0)
-- bookings: id, tutor_id, petshop_id, status, booking_date, ...
-- booking_items: booking_id, pet_id, service_id
-- profiles: id, display_name, avatar_url
```

## Files to Create

### 1. `supabase/migrations/20260225_004_add_avg_rating_trigger.sql`

**Purpose:** Auto-recalculate `petshops.avg_rating` when reviews are inserted/updated/deleted.

```sql
-- Trigger function: recalculate avg_rating for a petshop
CREATE OR REPLACE FUNCTION public.update_petshop_avg_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_petshop_id UUID;
  v_avg DECIMAL(3,2);
BEGIN
  -- Get petshop_id from the affected row
  IF TG_OP = 'DELETE' THEN
    v_petshop_id := OLD.petshop_id;
  ELSE
    v_petshop_id := NEW.petshop_id;
  END IF;

  -- Calculate new average (only non-hidden reviews)
  SELECT COALESCE(AVG(rating)::DECIMAL(3,2), 0)
  INTO v_avg
  FROM public.reviews
  WHERE petshop_id = v_petshop_id
    AND is_hidden = FALSE;

  -- Update petshop
  UPDATE public.petshops
  SET avg_rating = v_avg, updated_at = NOW()
  WHERE id = v_petshop_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trg_update_avg_rating ON public.reviews;
CREATE TRIGGER trg_update_avg_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_petshop_avg_rating();

-- RLS: tutors can insert reviews for their own bookings
CREATE POLICY "Tutor can create review for own booking" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = tutor_id
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_id
        AND tutor_id = auth.uid()
        AND status = 'completed'
    )
  );

-- RLS: petshop owner can update response fields only
CREATE POLICY "Petshop can respond to reviews" ON reviews
  FOR UPDATE USING (
    petshop_id IN (SELECT id FROM petshops WHERE owner_id = auth.uid())
  );
```

### 2. `packages/shared/src/utils/profanityFilter.ts`

**Purpose:** Profanity filter for PT-BR. Used by both mobile and web.

```typescript
// Common PT-BR profanity list (~100 words)
// Normalized: no accents, lowercase
const BLOCKED_WORDS = [
  'merda', 'porra', 'caralho', 'puta', 'putaria', 'foda', 'fodase',
  'arrombado', 'arrombada', 'cuzao', 'cuzão', 'buceta', 'viado',
  'viada', 'desgraça', 'desgraca', 'vagabundo', 'vagabunda',
  'fdp', 'pqp', 'vsf', 'tnc', 'vtnc', 'krl', 'pnc',
  'idiota', 'imbecil', 'babaca', 'otario', 'otária', 'trouxa',
  'lixo', 'nojento', 'nojenta', 'escroto', 'escrota',
  'corno', 'corna', 'piranha', 'safado', 'safada',
  'bosta', 'cu ', ' cu ', 'cuzinho', 'rabo',
  'cacete', 'pinto', 'pau ', ' pau ',
  'maldito', 'maldita', 'inferno', 'diabo',
  'burro', 'burra', 'retardado', 'retardada',
  'palhaço', 'palhaco', 'ridículo', 'ridiculo',
  'incompetente', 'inutil', 'inútil',
  'ladrão', 'ladrao', 'golpista', 'caloteiro',
  'porco', 'porca', 'imundo', 'imunda',
  'filho da puta', 'filha da puta', 'vai se fuder',
  'vai tomar', 'enfia no', 'pau no cu',
  'vá à merda', 'va a merda',
];

// Normalize text: remove accents, lowercase
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Check if text contains profanity
export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return BLOCKED_WORDS.some(word => {
    const normalizedWord = normalize(word);
    return normalized.includes(normalizedWord);
  });
}

// Get list of found profane words (for error message)
export function findProfanity(text: string): string[] {
  const normalized = normalize(text);
  return BLOCKED_WORDS.filter(word => {
    const normalizedWord = normalize(word);
    return normalized.includes(normalizedWord);
  });
}
```

### 3. `packages/shared/src/utils/index.ts`

**Purpose:** Export profanity filter from shared package.

```typescript
export { containsProfanity, findProfanity } from './profanityFilter';
```

### 4. `apps/mobile/src/screens/reviews/components/StarRating.tsx`

**Purpose:** Reusable star rating component (display + interactive).

```
Props:
  value: number          // 0-5
  onChange?: (rating: number) => void  // if provided, interactive mode
  size?: number          // star size, default 28
  readonly?: boolean     // default false

Layout:
  - Container: flexDirection row, gap 4
  - 5 stars (TouchableOpacity if interactive, View if readonly):
    - Filled star (value >= starIndex): Text "★" color #FFD700 fontSize {size}
    - Empty star: Text "☆" color #ddd fontSize {size}
    - onPress: onChange?.(starIndex) — only if not readonly

Note: This replaces any inline star rendering in existing ReviewCard components.
Export as named export.
```

### 5. `apps/mobile/src/screens/reviews/components/ReviewPrompt.tsx`

**Purpose:** Card prompting tutor to review after completed booking.

```
Props:
  bookingId: string
  petshopName: string
  onPress: () => void

Layout:
  - Card: backgroundColor #FFF8F0, borderRadius 12, padding 16, marginHorizontal 16, marginTop 12
    borderWidth 1, borderColor #FFE0B2
  - Row (flexDirection row, alignItems center):
    - Left: "⭐" fontSize 32
    - Center (flex 1, marginLeft 12):
      - Title: "Avaliar este serviço" fontSize 15, fontWeight 700, color #333
      - Sub: "Como foi sua experiência em {petshopName}?" fontSize 13, color #666
    - Right: TouchableOpacity "Avaliar" bg #FF6B6B, color #fff, paddingH 16, paddingV 8, borderRadius 8
      onPress: onPress
```

### 6. `apps/mobile/src/screens/reviews/WriteReviewScreen.tsx`

**Purpose:** Form to write a review for a completed booking.

```
Route: 'WriteReview'
Params: { bookingId: string; petshopId: string; petshopName: string }

Implementation:
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  handleSubmit:
    if (rating === 0) { Alert.alert('Erro', 'Selecione uma nota'); return; }
    if (comment && containsProfanity(comment)) {
      Alert.alert('Atenção', 'Seu comentário contém palavras inadequadas. Por favor, revise.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        booking_id: bookingId,
        tutor_id: user!.id,
        petshop_id: petshopId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === '23505') { // unique violation
          Alert.alert('Aviso', 'Você já avaliou este serviço.');
        } else {
          throw error;
        }
        return;
      }

      // Invalidate caches
      queryClient.invalidateQueries({ queryKey: ['reviews', petshopId] });
      queryClient.invalidateQueries({ queryKey: ['review-count', petshopId] });
      queryClient.invalidateQueries({ queryKey: ['petshop-profile', petshopId] });
      queryClient.invalidateQueries({ queryKey: ['booking-receipt'] });

      Alert.alert('Obrigado!', 'Sua avaliação foi enviada.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }

Layout (ScrollView, padding 16):
  - Title: "Avaliar {petshopName}" fontSize 22, fontWeight 700, color #333

  - Star section (marginTop 24, alignItems center):
    - Label: "Qual sua nota?" fontSize 16, color #666
    - <StarRating value={rating} onChange={setRating} size={40} />
    - Rating label below stars:
      0: "" (empty)
      1: "Péssimo" color #e74c3c
      2: "Ruim" color #e67e22
      3: "Regular" color #f39c12
      4: "Bom" color #27ae60
      5: "Excelente!" color #2ecc71

  - Comment section (marginTop 24):
    - Label: "Comentário (opcional)" fontSize 14, fontWeight 600
    - TextInput: multiline, numberOfLines 4, maxLength 500
      borderWidth 1, borderColor #ddd, borderRadius 12, padding 12, fontSize 15
      placeholder "Conte como foi sua experiência..."
      textAlignVertical 'top', minHeight 120
    - Counter: "{comment.length}/500" fontSize 12, color #999, textAlign right

  - Submit button (marginTop 24):
    - "Enviar Avaliação" bg #FF6B6B, color #fff, borderRadius 12, paddingVertical 16
      disabled if rating === 0 || submitting
      Shows ActivityIndicator if submitting
```

### 7. `apps/mobile/src/hooks/useCompletedBookings.ts`

**Purpose:** Fetch completed bookings that can be reviewed (no existing review).

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface ReviewableBooking {
  id: string;
  booking_date: string;
  petshop_id: string;
  petshop_name: string;
  has_review: boolean;
}

export function useCompletedBookings() {
  const { user } = useAuth();

  // Fetch completed bookings with review status
  // useQuery:
  //   queryKey: ['completed-bookings', user?.id]
  //   queryFn:
  //     const { data } = await supabase
  //       .from('bookings')
  //       .select(`
  //         id, booking_date, petshop_id,
  //         petshops:petshop_id(name),
  //         reviews(id)
  //       `)
  //       .eq('tutor_id', user!.id)
  //       .eq('status', 'completed')
  //       .order('booking_date', { ascending: false })
  //       .limit(20);
  //
  //     return data.map(b => ({
  //       id: b.id,
  //       booking_date: b.booking_date,
  //       petshop_id: b.petshop_id,
  //       petshop_name: b.petshops?.name || '',
  //       has_review: (b.reviews || []).length > 0,
  //     }));
  //
  //   enabled: !!user
  //   staleTime: 60 * 1000
  //
  // Return: { bookings, isLoading }
  // Derived: reviewableBookings = bookings.filter(b => !b.has_review)
}
```

### 8. `apps/web/src/hooks/useReviewsDashboard.ts`

**Purpose:** Fetch reviews for pet shop dashboard + respond functionality.

```typescript
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface DashboardReview {
  id: string;
  booking_id: string;
  tutor_id: string;
  rating: number;
  comment: string | null;
  petshop_response: string | null;
  response_date: string | null;
  is_reported: boolean;
  is_hidden: boolean;
  created_at: string;
  profiles: { display_name: string; avatar_url: string | null };
  bookings: {
    booking_date: string;
    booking_items: { pets: { name: string }; services: { name: string } }[];
  };
}

export function useReviewsDashboard(petshopId: string) {
  const [reviews, setReviews] = useState<DashboardReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReviews = useCallback(async () => {
    if (!petshopId) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('reviews')
        .select(`
          id, booking_id, tutor_id, rating, comment,
          petshop_response, response_date, is_reported, is_hidden, created_at,
          profiles:tutor_id(display_name, avatar_url),
          bookings:booking_id(
            booking_date,
            booking_items(
              pets:pet_id(name),
              services:service_id(name)
            )
          )
        `)
        .eq('petshop_id', petshopId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setReviews((data || []) as unknown as DashboardReview[]);
    } catch (err) {
      setError('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  }, [petshopId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Respond to a review
  const respondToReview = async (reviewId: string, response: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({
        petshop_response: response,
        response_date: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('petshop_id', petshopId);

    if (error) throw error;
    await fetchReviews();
  };

  // Report a review
  const reportReview = async (reviewId: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_reported: true })
      .eq('id', reviewId);

    if (error) throw error;
    await fetchReviews();
  };

  // Stats
  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const totalReviews = reviews.filter(r => !r.is_hidden).length;

  return { reviews, loading, error, respondToReview, reportReview, avgRating, totalReviews, refetch: fetchReviews };
}
```

### 9. `apps/web/src/app/(dashboard)/avaliacoes/components/ResponseModal.tsx`

**Purpose:** Modal for pet shop to respond to a review.

```
'use client';

Props:
  isOpen: boolean
  onClose: () => void
  reviewId: string
  tutorName: string
  onSubmit: (reviewId: string, response: string) => Promise<void>

Implementation:
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  handleSubmit:
    if (!response.trim()) return;
    if (containsProfanity(response)) { alert('Resposta contém palavras inadequadas.'); return; }
    setSubmitting(true);
    try { await onSubmit(reviewId, response.trim()); onClose(); }
    catch { alert('Erro ao enviar resposta'); }
    finally { setSubmitting(false); }

Layout (Tailwind):
  - Overlay + centered modal (same pattern as other modals)
  - Title: "Responder avaliação de {tutorName}"
  - Textarea: max 500 chars, rows 4, border rounded-lg
  - Counter: "{response.length}/500" text-sm text-gray-400
  - Buttons: "Cancelar" (outline) + "Enviar Resposta" (bg-[#FF6B6B])

Import containsProfanity from 'shared' package (or inline the import path).
```

### 10. `apps/web/src/app/(dashboard)/avaliacoes/components/ReviewTable.tsx`

**Purpose:** List of reviews with actions.

```
'use client';

Props:
  reviews: DashboardReview[]
  onRespond: (reviewId: string) => void
  onReport: (reviewId: string) => void

Layout (Tailwind):
  - List (not HTML table — cards are more readable):
  - Each review card: bg-white border rounded-lg p-4 mb-3
    - Header row (flex justify-between):
      - Left: tutor name (font-semibold) + avatar (w-8 h-8 rounded-full)
      - Right: date (text-sm text-gray-400) formatted DD/MM/YYYY
    - Stars row: render rating as "★★★★☆" (filled #FFD700, empty #ddd)
    - Booking info: "Pet: {pet.name} — Serviço: {service.name} — {booking_date}" text-sm text-gray-500
    - Comment: text-gray-700 mt-2 (or "Sem comentário" italic text-gray-400)
    - If is_reported: badge "Reportada" bg-orange-100 text-orange-700
    - If is_hidden: badge "Oculta" bg-red-100 text-red-700

    - Response section (if petshop_response exists):
      - bg-gray-50 rounded-lg p-3 mt-3 ml-4 border-l-4 border-[#FF6B6B]
      - "Sua resposta:" text-sm font-semibold
      - Response text: text-sm text-gray-600
      - Date: text-xs text-gray-400

    - Action row (flex gap-2 mt-3):
      - If no response yet: "Responder" button (outline, text-[#FF6B6B])
        onClick: onRespond(review.id)
      - "Reportar" button (text-sm text-gray-400 hover:text-red-500)
        onClick: confirm → onReport(review.id)
        Only show if not already reported
```

### 11. `apps/web/src/app/(dashboard)/avaliacoes/components/ReviewStats.tsx`

**Purpose:** Stats header showing average rating and totals.

```
Props:
  avgRating: string   // "4.7"
  totalReviews: number
  ratingDistribution: { [key: number]: number }  // { 5: 12, 4: 8, 3: 3, 2: 1, 1: 0 }

Layout (Tailwind):
  - Container: bg-white rounded-lg shadow p-6 mb-6
  - Grid 2 cols (md:grid-cols-2 gap-8):
    - Left: big rating display
      - Number: text-5xl font-bold text-gray-900 → "{avgRating}"
      - Stars below: rendered as "★★★★☆" large
      - Text: "{totalReviews} avaliações" text-sm text-gray-500
    - Right: rating distribution bars
      For each star (5 to 1):
        - Row (flex items-center gap-2):
          - "5 ★" text-sm w-10
          - Bar: flex-1 h-3 bg-gray-100 rounded-full overflow-hidden
            - Inner: bg-[#FFD700] h-full width = (count/total)*100%
          - Count: text-sm text-gray-400 w-8 text-right
```

## Files to Modify

### 12. `apps/web/src/app/(dashboard)/avaliacoes/page.tsx`

**Replace entirely:**

```typescript
'use client';

// Auth pattern: same as servicos/page.tsx
// State: selectedReviewId for response modal

// Components: ReviewStats + ReviewTable + ResponseModal
// Hook: useReviewsDashboard(petshopId)

// Calculate ratingDistribution from reviews:
//   const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
//   reviews.forEach(r => { if (!r.is_hidden) distribution[r.rating]++; });

// Layout:
//   <div className="max-w-5xl mx-auto">
//     <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
//       <Star className="w-6 h-6" /> Avaliações
//     </h1>
//     <ReviewStats avgRating={avgRating} totalReviews={totalReviews} ratingDistribution={distribution} />
//     <ReviewTable reviews={reviews} onRespond={setSelectedReviewId} onReport={handleReport} />
//     {selectedReviewId && (
//       <ResponseModal isOpen onClose={() => setSelectedReviewId(null)}
//         reviewId={selectedReviewId}
//         tutorName={reviews.find(r => r.id === selectedReviewId)?.profiles.display_name || ''}
//         onSubmit={respondToReview} />
//     )}
//   </div>
```

### 13. `apps/mobile/src/navigation/RootNavigator.tsx`

**Changes:** Add WriteReview screen.

1. Import:
```typescript
import { WriteReviewScreen } from '../screens/reviews/WriteReviewScreen';
```

2. Add to `MainStackParamList`:
```typescript
WriteReview: { bookingId: string; petshopId: string; petshopName: string };
```

3. Add screen:
```tsx
<MainStack.Screen name="WriteReview" component={WriteReviewScreen}
  options={{ headerTitle: 'Avaliar Serviço' }} />
```

### 14. `apps/mobile/src/screens/booking/BookingSuccessScreen.tsx`

**Changes:** Add ReviewPrompt below the receipt when booking is completed.

After receipt card, add:
```typescript
import { useCompletedBookings } from '@/hooks/useCompletedBookings';
import { ReviewPrompt } from '../reviews/components/ReviewPrompt';

// Check if this booking has been reviewed
// If booking is completed AND no review exists → show ReviewPrompt

// Inside the component, after receipt:
{booking && !booking.reviews?.length && (
  <ReviewPrompt
    bookingId={bookingId}
    petshopName={booking.petshops?.name || ''}
    onPress={() => navigation.navigate('WriteReview', {
      bookingId, petshopId: booking.petshop_id, petshopName: booking.petshops?.name || ''
    })}
  />
)}
```

### 15. `apps/mobile/src/screens/petshop/components/ReviewCard.tsx`

**Changes:** Add "Reportar" button to existing ReviewCard.

Add at bottom of each review card:
```typescript
// Props: add onReport?: (reviewId: string) => void

// At bottom of card, after petshop_response section:
{onReport && (
  <TouchableOpacity onPress={() => {
    Alert.alert('Reportar', 'Deseja reportar esta avaliação como inadequada?', [
      { text: 'Cancelar' },
      { text: 'Reportar', style: 'destructive', onPress: () => {
        supabase.from('reviews').update({ is_reported: true }).eq('id', review.id);
        onReport(review.id);
      }},
    ]);
  }}>
    <Text style={{ fontSize: 12, color: '#999', marginTop: 8 }}>Reportar</Text>
  </TouchableOpacity>
)}
```

### 16. `packages/shared/src/index.ts`

**Changes:** Export utils.

Add:
```typescript
export * from './utils';
```

## Implementation Order

1. **Migration:** `20260225_004_add_avg_rating_trigger.sql`
2. **Shared:** `profanityFilter.ts` + update `packages/shared/src/index.ts`
3. **Mobile components:** `StarRating.tsx` → `ReviewPrompt.tsx`
4. **Mobile screens:** `WriteReviewScreen.tsx`
5. **Mobile hooks:** `useCompletedBookings.ts`
6. **Web hooks:** `useReviewsDashboard.ts`
7. **Web components:** `ReviewStats.tsx` → `ReviewTable.tsx` → `ResponseModal.tsx`
8. **Web page:** Replace `avaliacoes/page.tsx`
9. **Wiring:** RootNavigator + BookingSuccessScreen + ReviewCard report button

## Validation Rules

| Field | Rule |
|-------|------|
| rating | Required, 1-5 integer |
| comment | Optional, max 500 chars, no profanity |
| petshop_response | Max 500 chars, no profanity |
| booking_id | Must be unique in reviews (1 review per booking) |
| tutor_id | Must match booking's tutor_id |
| booking status | Must be 'completed' to allow review |
| is_reported | Reported reviews remain visible until admin hides (IPET-021) |

## Testing Checklist

After implementation, verify:
- [ ] StarRating renders 1-5 stars, tap changes value
- [ ] ReviewPrompt appears on BookingSuccessScreen for unreviewed bookings
- [ ] ReviewPrompt disappears after review is submitted
- [ ] WriteReviewScreen: submit with 0 stars → shows error
- [ ] WriteReviewScreen: profanity in comment → blocked with message
- [ ] WriteReviewScreen: successful submit → review appears in pet shop profile
- [ ] Duplicate review (same booking) → shows "já avaliou" message
- [ ] avg_rating trigger recalculates on new review
- [ ] Dashboard: ReviewStats shows correct average and distribution bars
- [ ] Dashboard: ReviewTable lists all reviews with tutor name, stars, comment
- [ ] Dashboard: "Responder" opens ResponseModal
- [ ] Dashboard: response saved and appears in review card
- [ ] Dashboard: profanity in response → blocked
- [ ] Dashboard: "Reportar" marks review as reported
- [ ] App: "Reportar" button on ReviewCard works with confirmation
- [ ] AllReviewsScreen (IPET-009): sort by recent/best/worst still works
- [ ] Pet shop profile avg_rating updates after new review
- [ ] TypeScript compiles: web + mobile

## Git Commit

```bash
git add supabase/migrations/20260225_004_add_avg_rating_trigger.sql packages/shared/src/utils/ packages/shared/src/index.ts apps/mobile/src/screens/reviews/ apps/mobile/src/hooks/useCompletedBookings.ts apps/mobile/src/screens/petshop/components/ReviewCard.tsx apps/mobile/src/screens/booking/BookingSuccessScreen.tsx apps/mobile/src/navigation/RootNavigator.tsx apps/web/src/hooks/useReviewsDashboard.ts apps/web/src/app/\(dashboard\)/avaliacoes/
git commit -m "feat: implement review & rating system IPET-016

- WriteReviewScreen: 1-5 stars + comment with profanity filter
- ReviewPrompt card on BookingSuccessScreen for unreviewed bookings
- Dashboard: review list with respond + report actions
- ReviewStats with avg rating + distribution bars
- ResponseModal for pet shop replies
- Profanity filter in shared package (PT-BR ~100 words)
- DB trigger auto-recalculates petshop avg_rating
- Report button on ReviewCard (tutor + petshop side)
- Unique constraint: 1 review per booking enforced"
```

## Important Notes

- **1 migration** needed — trigger for avg_rating auto-recalculation
- **Profanity filter** is in `packages/shared/` — import path depends on tsconfig paths. Both web (`shared`) and mobile (`shared`) should resolve it. Check existing tsconfig paths.
- **UNIQUE constraint** on `reviews.booking_id` already exists — handles duplicate prevention at DB level. Catch error code `23505` for user-friendly message.
- **RLS policies** for INSERT ensure only the booking's tutor can create a review, and only for completed bookings.
- **avg_rating trigger** runs on every INSERT/UPDATE/DELETE — keeps `petshops.avg_rating` always current.
- **Hidden reviews** (`is_hidden = true`) are excluded from avg calculation but still visible to admin (IPET-021).
- **Report** only sets `is_reported = true` — admin moderation (hiding) is IPET-021.
- **AllReviewsScreen** from IPET-009 already handles viewing/sorting reviews — no changes needed there.
