# IPET-009 SPEC — Pet Shop Profile View (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. The mobile app uses **Expo 51 + React Native 0.74 + TypeScript**. IPET-001 to IPET-008 are implemented. This spec covers IPET-009: Pet Shop Profile View in the tutor mobile app.

**Tech stack:** Expo 51, React Native 0.74, TypeScript strict, React Navigation 6 (native-stack), TanStack React Query 5, Supabase JS 2.45, `react-native-reanimated` 3.6.

**Patterns to follow:** See `apps/mobile/src/hooks/usePetShops.ts` for TanStack React Query hook pattern. See `apps/mobile/src/screens/home/HomeScreen.tsx` for screen pattern. See `apps/mobile/src/hooks/usePets.ts` for useState+useEffect hook pattern.

**Styling:** React Native `StyleSheet.create()`. Colors: `#FF6B6B` (primary), `#333` (text), `#666`/`#999` (muted), `#f0f0f0` (bg), `#ddd` (border). No CSS-in-JS libraries.

**Imports:** Use `@/` path alias (maps to `./src/`). Supabase from `@/lib/supabase`.

## Existing Database Schema (already migrated)

```sql
-- petshops
CREATE TABLE public.petshops (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id),
  name TEXT, description TEXT,
  address TEXT, city TEXT, state TEXT,
  lat DECIMAL, lng DECIMAL,
  phone TEXT, cover_photo TEXT,
  status TEXT, -- active/pending/suspended
  avg_rating DECIMAL(3,2),
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
);

-- services
CREATE TABLE public.services (
  id UUID PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE,
  name TEXT, description TEXT,
  category TEXT, -- banho/tosa/combo/addon
  duration_minutes INT,
  is_addon BOOLEAN, is_active BOOLEAN,
  created_at TIMESTAMPTZ
);

-- service_prices
CREATE TABLE public.service_prices (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  size TEXT, -- P/M/G/GG
  price DECIMAL(10,2),
  UNIQUE(service_id, size)
);

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) UNIQUE,
  tutor_id UUID REFERENCES public.profiles(id),
  petshop_id UUID REFERENCES public.petshops(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  petshop_response TEXT,
  response_date TIMESTAMPTZ,
  is_reported BOOLEAN, is_hidden BOOLEAN,
  created_at TIMESTAMPTZ
);

-- petshop_photos
CREATE TABLE public.petshop_photos (
  id UUID PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE,
  photo_url TEXT,
  display_order INT,
  created_at TIMESTAMPTZ
);

-- profiles (relevant columns)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT
);

-- pets (relevant columns)
CREATE TABLE public.pets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  name TEXT, size TEXT -- P/M/G/GG
);

-- schedules (for opening hours display)
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE,
  day_of_week INT, -- 0=Dom...6=Sab
  start_time TIME, end_time TIME,
  is_active BOOLEAN
);
```

## Files to Create

### 1. `apps/mobile/src/hooks/usePetShopProfile.ts`

**Purpose:** Fetch complete pet shop profile with services, reviews, photos, and schedules.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ServicePrice {
  id: string;
  size: string; // P/M/G/GG
  price: number;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string; // banho/tosa/combo/addon
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

export function usePetShopProfile(petshopId: string) {
  // useQuery with queryKey ['petshop-profile', petshopId]
  // queryFn:
  //   const { data, error } = await supabase
  //     .from('petshops')
  //     .select(`
  //       id, name, description, address, city, state, phone, cover_photo,
  //       avg_rating, lat, lng,
  //       petshop_photos(id, photo_url, display_order),
  //       services!inner(id, name, description, category, duration_minutes, is_addon,
  //         service_prices(id, size, price)
  //       ),
  //       schedules(day_of_week, start_time, end_time, is_active)
  //     `)
  //     .eq('id', petshopId)
  //     .eq('services.is_active', true)
  //     .single();
  //
  //   IMPORTANT: Do NOT use !inner for services — use regular join.
  //   A petshop with 0 active services should still load (not 404).
  //   Correct: services(id, name, ...) without !inner
  //
  //   Reviews are fetched separately (see useReviews hook) for pagination.
  //
  //   Sort petshop_photos by display_order in JS after fetch.
  //   Filter out services where is_active = false in JS (Supabase nested filters are limited).
  //
  // staleTime: 5 * 60 * 1000
  // enabled: !!petshopId
  //
  // Return: { profile: data as PetShopProfile | null, isLoading, error }
}
```

### 2. `apps/mobile/src/hooks/useReviews.ts`

**Purpose:** Fetch reviews for a pet shop with pagination and sorting.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Review } from './usePetShopProfile';

type ReviewSort = 'recent' | 'best' | 'worst';

export function useReviews(
  petshopId: string,
  options?: { limit?: number; sort?: ReviewSort; enabled?: boolean }
) {
  // Default: limit=3, sort='recent', enabled=true
  //
  // useQuery with queryKey ['reviews', petshopId, limit, sort]
  // queryFn:
  //   let query = supabase
  //     .from('reviews')
  //     .select('id, tutor_id, rating, comment, petshop_response, response_date, created_at, profiles:tutor_id(display_name, avatar_url)')
  //     .eq('petshop_id', petshopId)
  //     .eq('is_hidden', false);
  //
  //   Sort:
  //     'recent' → .order('created_at', { ascending: false })
  //     'best'   → .order('rating', { ascending: false })
  //     'worst'  → .order('rating', { ascending: true })
  //
  //   .limit(limit)
  //
  // staleTime: 5 * 60 * 1000
  //
  // Return: { reviews: data as Review[] || [], isLoading, error, refetch }
}

export function useReviewCount(petshopId: string) {
  // useQuery with queryKey ['review-count', petshopId]
  // queryFn:
  //   const { count, error } = await supabase
  //     .from('reviews')
  //     .select('*', { count: 'exact', head: true })
  //     .eq('petshop_id', petshopId)
  //     .eq('is_hidden', false);
  //
  // Return: { count: count || 0, isLoading }
}
```

### 3. `apps/mobile/src/screens/petshop/components/ProfileHeader.tsx`

**Purpose:** Banner with cover photo, pet shop info, rating badge.

```
Props:
  profile: PetShopProfile
  distance?: number  // km, passed from navigation params
  reviewCount: number

Layout (ScrollView-friendly, not standalone scroll):
  - Cover photo: Image, height 220, width 100%, backgroundColor #f0f0f0
    - If no cover_photo: placeholder with 🐾 emoji centered
  - Rating badge: absolute positioned top-right on banner
    - Background #FF6B6B, borderRadius 20, paddingH 12 paddingV 6
    - Text: "{avg_rating.toFixed(1)} ★" white bold
  - Info container below banner, padding 16:
    - Name: fontSize 22, fontWeight 700, color #333
    - Address: fontSize 14, color #666, marginTop 4
      - Format: "{address}, {city} - {state}"
    - Meta row (flexDirection row, gap 16, marginTop 12):
      - Distance (if provided): "📍 {distance.toFixed(1)} km"
      - Phone (if exists): "📞 {phone}"
      - Reviews: "⭐ {reviewCount} avaliações"
    - Description (if exists): fontSize 14, color #666, marginTop 12, lineHeight 20
    - Opening hours summary (from schedules):
      - Find today's schedule by day_of_week matching new Date().getDay()
      - If active today: "🕐 Hoje: {start_time} - {end_time}" in green (#2ecc71)
      - If inactive today: "🕐 Fechado hoje" in red (#e74c3c)

Styles: StyleSheet.create({...})
```

### 4. `apps/mobile/src/screens/petshop/components/ServiceList.tsx`

**Purpose:** Services organized by category with prices based on user's pet sizes.

```
Props:
  services: Service[]
  userPetSizes: string[]  // ['P', 'G'] from user's pets

Logic:
  - Group services by category: { banho: [...], tosa: [...], combo: [...], addon: [...] }
  - Category display names: { banho: 'Banho', tosa: 'Tosa', combo: 'Combos', addon: 'Adicionais' }
  - Only show categories that have services
  - Render each category as a section with title + ServiceCard list

Price logic (per service):
  - If userPetSizes is empty → show "a partir de R$ {lowestPrice}"
  - If userPetSizes has 1 size → find price for that size, show "R$ {price}"
  - If userPetSizes has multiple sizes → find min/max price for those sizes
    - If min === max → show "R$ {price}"
    - If min !== max → show "R$ {min} - R$ {max}"
  - If no price found for user's pet size → show "Consultar"

Container: paddingHorizontal 16, marginTop 16
Section title: fontSize 18, fontWeight 700, color #333, marginBottom 8, marginTop 16
```

### 5. `apps/mobile/src/screens/petshop/components/ServiceCard.tsx`

**Purpose:** Individual service card showing name, description, duration, price.

```
Props:
  service: Service
  priceDisplay: string  // pre-computed: "R$ 45", "R$ 35 - 55", "a partir de R$ 30", "Consultar"

Layout:
  - Card: backgroundColor #f9f9f9, borderRadius 8, padding 12, marginBottom 8
  - Row (flexDirection row, justifyContent space-between, alignItems center):
    - Left (flex 1):
      - Name: fontSize 15, fontWeight 600, color #333
      - Description (if exists): fontSize 12, color #999, marginTop 2, numberOfLines 2
      - Duration: fontSize 12, color #666, marginTop 4 → "⏱ {duration_minutes} min"
    - Right:
      - Price: fontSize 15, fontWeight 700, color #FF6B6B
      - If is_addon: small badge below price "Add-on" fontSize 10, color #999
```

### 6. `apps/mobile/src/screens/petshop/components/ReviewSection.tsx`

**Purpose:** Shows 3 most recent reviews + "See all" button.

```
Props:
  reviews: Review[]
  reviewCount: number
  onSeeAll: () => void

Layout:
  - Container: paddingHorizontal 16, marginTop 24
  - Header row (flexDirection row, justifyContent space-between, alignItems center):
    - Title: "Avaliações" fontSize 18, fontWeight 700, color #333
    - "Ver todas ({reviewCount})" → TouchableOpacity, color #FF6B6B, fontSize 14
  - If reviews.length === 0:
    - Empty text: "Nenhuma avaliação ainda" fontSize 14, color #999, marginTop 12
  - Else: map reviews → ReviewCard
```

### 7. `apps/mobile/src/screens/petshop/components/ReviewCard.tsx`

**Purpose:** Single review with author, rating stars, comment, and pet shop response.

```
Props:
  review: Review

Layout:
  - Card: borderBottomWidth 1, borderBottomColor #f0f0f0, paddingVertical 12
  - Header row (flexDirection row, alignItems center):
    - Avatar: 36x36 rounded Image (or placeholder circle with initials)
    - Right of avatar (marginLeft 10):
      - Name: fontSize 14, fontWeight 600, color #333
      - Date: fontSize 12, color #999 → format as "DD/MM/YYYY"
  - Stars row (marginTop 6):
    - Render rating as "★★★★☆" using filled ★ (color #FFD700) and empty ☆ (color #ddd)
  - Comment (if exists): fontSize 14, color #666, marginTop 6, lineHeight 20
  - Pet shop response (if petshop_response exists):
    - Container: backgroundColor #f5f5f5, borderRadius 8, padding 10, marginTop 8, marginLeft 20
    - "Resposta do pet shop:" fontSize 12, fontWeight 600, color #333
    - Response text: fontSize 13, color #666, marginTop 4
    - Response date: fontSize 11, color #999, marginTop 4

Date formatting helper:
  function formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  }
```

### 8. `apps/mobile/src/screens/petshop/components/PhotoGallery.tsx`

**Purpose:** Horizontal scrolling photo gallery.

```
Props:
  photos: PetShopPhoto[]

Layout:
  - If photos.length === 0: return null (don't render section)
  - Container: marginTop 24
  - Title: "Fotos" fontSize 18, fontWeight 700, color #333, paddingHorizontal 16
  - FlatList:
    - horizontal={true}
    - showsHorizontalScrollIndicator={false}
    - contentContainerStyle: paddingHorizontal 16, paddingTop 12, gap 10
    - Each item: Image, width 200, height 150, borderRadius 8, backgroundColor #f0f0f0
    - keyExtractor: item.id
```

### 9. `apps/mobile/src/screens/petshop/components/BookButton.tsx`

**Purpose:** Fixed "Agendar" button at bottom of screen.

```
Props:
  onPress: () => void
  disabled?: boolean  // true if no services available

Layout:
  - Container: position absolute, bottom 0, left 0, right 0,
    backgroundColor #fff, paddingHorizontal 16, paddingVertical 12,
    borderTopWidth 1, borderTopColor #f0f0f0,
    shadowColor #000, shadowOffset {0, -2}, shadowOpacity 0.1, elevation 5
  - Button: TouchableOpacity
    - backgroundColor: disabled ? '#ccc' : '#FF6B6B'
    - borderRadius 12, paddingVertical 16, alignItems center
    - Text: "Agendar" fontSize 16, fontWeight 700, color #fff
    - disabled prop passed to TouchableOpacity
```

### 10. `apps/mobile/src/screens/petshop/PetShopProfileScreen.tsx`

**Purpose:** Main container screen. Route: `PetShopProfile`.

```typescript
import React from 'react';
import { View, ScrollView, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/RootNavigator';
import { usePetShopProfile } from '@/hooks/usePetShopProfile';
import { useReviews, useReviewCount } from '@/hooks/useReviews';
import { usePets } from '@/hooks/usePets';
import { ProfileHeader } from './components/ProfileHeader';
import { ServiceList } from './components/ServiceList';
import { ReviewSection } from './components/ReviewSection';
import { PhotoGallery } from './components/PhotoGallery';
import { BookButton } from './components/BookButton';

type Props = NativeStackScreenProps<MainStackParamList, 'PetShopProfile'>;

// Screen receives params: { petshopId: string; distance?: number }
//
// Implementation:
//   const { petshopId, distance } = route.params;
//   const { profile, isLoading, error } = usePetShopProfile(petshopId);
//   const { reviews, isLoading: reviewsLoading } = useReviews(petshopId, { limit: 3 });
//   const { count: reviewCount } = useReviewCount(petshopId);
//   const { pets } = usePets();
//
//   Derive userPetSizes:
//     const userPetSizes = pets.map(p => p.size);
//
//   handleSeeAllReviews:
//     navigation.navigate('AllReviews', { petshopId, petshopName: profile.name });
//
//   handleBook:
//     // TODO: Navigate to booking flow (IPET-010)
//     // navigation.navigate('Booking', { petshopId });
//
//   Loading state: ActivityIndicator centered, color #FF6B6B
//   Error state: centered error message
//
//   Main layout:
//     <View style={{ flex: 1, backgroundColor: '#fff' }}>
//       <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
//         <ProfileHeader profile={profile} distance={distance} reviewCount={reviewCount} />
//         <ServiceList services={profile.services} userPetSizes={userPetSizes} />
//         <PhotoGallery photos={profile.petshop_photos} />
//         <ReviewSection reviews={reviews} reviewCount={reviewCount} onSeeAll={handleSeeAllReviews} />
//       </ScrollView>
//       <BookButton onPress={handleBook} disabled={profile.services.length === 0} />
//     </View>
```

### 11. `apps/mobile/src/screens/petshop/AllReviewsScreen.tsx`

**Purpose:** Full review list with sort filter. Route: `AllReviews`.

```typescript
import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/RootNavigator';
import { useReviews } from '@/hooks/useReviews';
import { ReviewCard } from './components/ReviewCard';

type Props = NativeStackScreenProps<MainStackParamList, 'AllReviews'>;

// Screen receives params: { petshopId: string; petshopName: string }
//
// State: sort: 'recent' | 'best' | 'worst' (default 'recent')
//
// const { reviews, isLoading } = useReviews(petshopId, { limit: 100, sort });
//
// Layout:
//   - Filter bar (flexDirection row, gap 8, padding 16):
//     - 3 filter chips: "Recentes", "Melhores", "Piores"
//     - Active chip: backgroundColor #FF6B6B, color #fff
//     - Inactive chip: backgroundColor #f0f0f0, color #666
//     - Chip style: paddingH 16, paddingV 8, borderRadius 20
//   - FlatList of ReviewCard
//   - Empty state if no reviews
//   - Loading: ActivityIndicator
```

## Files to Modify

### 12. `apps/mobile/src/navigation/RootNavigator.tsx`

**Changes:**
1. Import new screens:
```typescript
import { PetShopProfileScreen } from '../screens/petshop/PetShopProfileScreen';
import { AllReviewsScreen } from '../screens/petshop/AllReviewsScreen';
```

2. Add to `MainStackParamList`:
```typescript
export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  MyPets: undefined;
  AddPet: { petId?: string; editingPet?: Pet };
  PetDetail: { petId: string };
  PetShopProfile: { petshopId: string; distance?: number };  // ADD
  AllReviews: { petshopId: string; petshopName: string };     // ADD
};
```

3. Add screens to `MainNavigator` (before `</MainStack.Navigator>`):
```tsx
<MainStack.Screen
  name="PetShopProfile"
  component={PetShopProfileScreen}
  options={{ headerTitle: 'Pet Shop' }}
/>
<MainStack.Screen
  name="AllReviews"
  component={AllReviewsScreen}
  options={({ route }) => ({ headerTitle: `Avaliações - ${route.params.petshopName}` })}
/>
```

### 13. `apps/mobile/src/screens/home/HomeScreen.tsx`

**Changes:** Wire up navigation to PetShopProfile.

1. Destructure `navigation` from props:
```typescript
export const HomeScreen: React.FC<Props> = ({ navigation }) => {
```

2. Update `handlePetShopPress` to accept petshop and navigate:
```typescript
const handlePetShopPress = (petshopId: string, distance: number) => {
  navigation.navigate('PetShopProfile', { petshopId, distance });
};
```

3. Update `PetShopCard` in FlatList renderItem:
```tsx
<PetShopCard
  petshop={item}
  onPress={() => handlePetShopPress(item.id, item.distance_km)}
/>
```

## Implementation Order

1. **Hooks:** `usePetShopProfile.ts` → `useReviews.ts`
2. **Components (leaf first):** `ReviewCard` → `ServiceCard` → `BookButton` → `PhotoGallery` → `ProfileHeader` → `ServiceList` → `ReviewSection`
3. **Screens:** `PetShopProfileScreen.tsx` → `AllReviewsScreen.tsx`
4. **Navigation:** Update `RootNavigator.tsx` (add types + screens)
5. **Wiring:** Update `HomeScreen.tsx` (navigation to profile)

## Validation Rules

| Field | Rule |
|-------|------|
| petshopId | Required UUID, must exist in petshops table |
| review.rating | 1-5 integer, render as filled/empty stars |
| service_prices.size | One of: P, M, G, GG |
| service.category | One of: banho, tosa, combo, addon |
| photos | Sorted by display_order ascending |
| schedules.day_of_week | 0=Dom, 1=Seg...6=Sab |

## Testing Checklist

After implementation, verify:
- [ ] Perfil carrega com dados corretos (nome, endereço, nota)
- [ ] Serviços agrupados por categoria corretamente
- [ ] Preço exibido conforme porte do pet do tutor
- [ ] Faixa de preço exibida para múltiplos pets com portes diferentes
- [ ] Tutor sem pet vê "a partir de R$ X"
- [ ] Avaliações mostram 3 mais recentes
- [ ] "Ver todas" navega para AllReviewsScreen
- [ ] Filtros de avaliação (recentes/melhores/piores) funcionam
- [ ] Resposta do pet shop aparece indentada no ReviewCard
- [ ] Galeria de fotos com scroll horizontal funciona
- [ ] Pet shop sem fotos não mostra seção de galeria
- [ ] Pet shop sem avaliações mostra "Nenhuma avaliação ainda"
- [ ] Botão "Agendar" fixo no footer
- [ ] Botão desabilitado se pet shop não tem serviços
- [ ] Navegação Home → PetShopProfile funciona
- [ ] Horário de funcionamento do dia atual aparece no header
- [ ] TypeScript compila sem erros: `cd apps/mobile && npx tsc --noEmit`

## Git Commit

After all files pass validation:
```bash
git add apps/mobile/src/hooks/usePetShopProfile.ts apps/mobile/src/hooks/useReviews.ts apps/mobile/src/screens/petshop/ apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/src/screens/home/HomeScreen.tsx
git commit -m "feat: implement pet shop profile view IPET-009

- Pet shop profile screen with banner, info, rating
- Service list grouped by category with price per pet size
- Review section with 3 recent + all reviews screen with filters
- Photo gallery with horizontal scroll
- Fixed book button in footer
- Hooks: usePetShopProfile, useReviews
- Navigation wiring from Home → PetShopProfile → AllReviews"
```

## Important Notes

- Follow EXACT same patterns as existing hooks (`usePetShops.ts` uses TanStack React Query) and screens (`HomeScreen.tsx`)
- Import supabase from `@/lib/supabase` (NOT from `@supabase/supabase-js`)
- Use React Native `StyleSheet.create()` for all styling — NO Tailwind, NO CSS
- Use `@react-navigation/native-stack` types for screen props
- Colors: `#FF6B6B` primary, `#333` text, `#666`/`#999` secondary, `#f0f0f0` background
- Dates in Brazilian format: DD/MM/YYYY
- Times in 24h format: HH:MM
- Price in BRL: "R$ 45" format
- Navigation params must match `MainStackParamList` types exactly
