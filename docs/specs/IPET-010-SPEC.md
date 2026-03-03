# IPET-010 SPEC — Service Selection & Slot Booking Flow (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. The mobile app uses **Expo 51 + React Native 0.74 + TypeScript**. IPET-001 to IPET-009 are implemented. This spec covers IPET-010: the complete booking flow in the tutor mobile app.

**Tech stack:** Expo 51, React Native 0.74, TypeScript strict, React Navigation 6 (native-stack), TanStack React Query 5, Supabase JS 2.45, `react-native-reanimated` 3.6.

**Patterns to follow:** See `apps/mobile/src/hooks/usePetShops.ts` for TanStack React Query pattern. See `apps/mobile/src/hooks/usePets.ts` for useState+useEffect pattern. See `apps/mobile/src/screens/home/HomeScreen.tsx` for screen pattern.

**Styling:** React Native `StyleSheet.create()`. Colors: `#FF6B6B` (primary), `#333` (text), `#666`/`#999` (muted), `#f0f0f0` (bg), `#ddd` (border). No CSS-in-JS libraries.

**Imports:** Use `@/` path alias (maps to `./src/`). Supabase from `@/lib/supabase`.

## Existing Database Schema (already migrated — NO new migrations needed)

```sql
-- bookings
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID REFERENCES public.profiles(id) NOT NULL,
  petshop_id UUID REFERENCES public.petshops(id) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT CHECK (status IN ('pending_payment','confirmed','in_progress','completed','cancelled','no_show')) DEFAULT 'pending_payment',
  total_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  payment_id TEXT,
  payment_status TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('tutor','petshop','system')),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- booking_items (1 booking has N items, one per pet+service)
CREATE TABLE public.booking_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) NOT NULL,
  service_id UUID REFERENCES public.services(id) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INT NOT NULL
);

-- petshop_multi_pet_discount
CREATE TABLE public.petshop_multi_pet_discount (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE NOT NULL,
  min_pets INT NOT NULL DEFAULT 2,
  discount_percent DECIMAL(5,2) NOT NULL,
  UNIQUE(petshop_id, min_pets)
);

-- services (already exists)
CREATE TABLE public.services (
  id UUID PRIMARY KEY,
  petshop_id UUID REFERENCES public.petshops(id) ON DELETE CASCADE,
  name TEXT, description TEXT,
  category TEXT, -- banho/tosa/combo/addon
  duration_minutes INT,
  is_addon BOOLEAN, is_active BOOLEAN
);

-- service_prices (already exists)
CREATE TABLE public.service_prices (
  id UUID PRIMARY KEY,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  size TEXT, -- P/M/G/GG
  price DECIMAL(10,2),
  UNIQUE(service_id, size)
);

-- pets (already exists)
CREATE TABLE public.pets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  name TEXT, species TEXT, breed TEXT,
  size TEXT, -- P/M/G/GG
  photo_url TEXT
);

-- RPC function (already exists from IPET-008)
-- get_available_slots(p_petshop_id UUID, p_date DATE)
-- RETURNS TABLE (slot_start TIME, slot_end TIME, available_spots INT)
```

## Booking Flow Architecture

```
5 Steps — Single Container Screen — State via React Context + useReducer

Step 1: SelectPets      → Pick 1+ pets with checkboxes
Step 2: SelectServices   → For each pet, pick main service + optional add-ons
Step 3: SelectDate       → Calendar strip (next 14 days)
Step 4: SelectTime       → Available time slots for chosen date
Step 5: Review           → Summary with prices, discount, total → "Agendar e Pagar"
```

## Files to Create

### 1. `apps/mobile/src/screens/booking/context/BookingContext.tsx`

**Purpose:** State management for the entire booking flow using React Context + useReducer.

```typescript
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// --- Types ---

export interface SelectedPet {
  id: string;
  name: string;
  size: string;     // P/M/G/GG
  photo_url: string | null;
}

export interface SelectedService {
  petId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  price: number;        // price for this pet's size
  duration_minutes: number;
}

export interface SelectedAddon {
  petId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration_minutes: number;
}

export interface BookingState {
  step: number;           // 1-5
  petshopId: string;
  petshopName: string;
  petshopAddress: string;
  selectedPets: SelectedPet[];
  selectedServices: SelectedService[];  // one main service per pet
  selectedAddons: SelectedAddon[];      // 0+ addons per pet
  selectedDate: string | null;          // "YYYY-MM-DD"
  selectedSlot: { start: string; end: string } | null; // "HH:MM"
  discount: { percent: number; minPets: number } | null;
}

// --- Actions ---

type BookingAction =
  | { type: 'SET_PETSHOP'; petshopId: string; petshopName: string; petshopAddress: string }
  | { type: 'SET_PETS'; pets: SelectedPet[] }
  | { type: 'SET_SERVICE'; petId: string; service: Omit<SelectedService, 'petId'> }
  | { type: 'TOGGLE_ADDON'; petId: string; addon: Omit<SelectedAddon, 'petId'> }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_SLOT'; start: string; end: string }
  | { type: 'SET_DISCOUNT'; discount: { percent: number; minPets: number } | null }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

const initialState: BookingState = {
  step: 1,
  petshopId: '',
  petshopName: '',
  petshopAddress: '',
  selectedPets: [],
  selectedServices: [],
  selectedAddons: [],
  selectedDate: null,
  selectedSlot: null,
  discount: null,
};

// --- Reducer ---
// Implement full reducer handling all action types:
//   SET_PETSHOP: set petshopId, petshopName, petshopAddress
//   SET_PETS: replace selectedPets array. Also clear services/addons for removed pets.
//   SET_SERVICE: upsert in selectedServices by petId (replace if exists, add if not)
//   TOGGLE_ADDON: if addon with same petId+serviceId exists → remove it, else → add it
//   SET_DATE: set selectedDate, clear selectedSlot (slot depends on date)
//   SET_SLOT: set selectedSlot { start, end }
//   SET_DISCOUNT: set discount
//   GO_TO_STEP: set step to specific number
//   NEXT_STEP: step + 1 (max 5)
//   PREV_STEP: step - 1 (min 1)
//   RESET: return initialState

// --- Context ---

interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  // Computed values:
  totalDuration: number;      // sum of all services + addons duration_minutes
  subtotal: number;           // sum of all prices before discount
  discountAmount: number;     // subtotal * discount.percent / 100
  totalAmount: number;        // subtotal - discountAmount
  slotsNeeded: number;        // Math.ceil(totalDuration / slotDurationMinutes) — will need slotDuration from schedule
}

// Create context, provider component, and useBooking hook
// Provider wraps children with the context
// useBooking throws if used outside provider

// Computed values logic:
//   totalDuration = sum of selectedServices.duration_minutes + sum of selectedAddons.duration_minutes
//   subtotal = sum of selectedServices.price + sum of selectedAddons.price
//   discountAmount = state.discount && state.selectedPets.length >= state.discount.minPets
//     ? subtotal * state.discount.percent / 100 : 0
//   totalAmount = subtotal - discountAmount

export { BookingProvider, useBooking };
```

### 2. `apps/mobile/src/screens/booking/hooks/useAvailableSlots.ts`

**Purpose:** Fetch available slots for a date using the RPC from IPET-008.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AvailableSlot {
  slot_start: string;   // "HH:MM:SS"
  slot_end: string;     // "HH:MM:SS"
  available_spots: number;
}

export function useAvailableSlots(petshopId: string, date: string | null) {
  // useQuery:
  //   queryKey: ['available-slots', petshopId, date]
  //   queryFn: call supabase.rpc('get_available_slots', { p_petshop_id: petshopId, p_date: date })
  //   enabled: !!petshopId && !!date
  //   staleTime: 2 * 60 * 1000 (2 min — slots change frequently)
  //
  // Return: { slots: data as AvailableSlot[] || [], isLoading, error, refetch }
}
```

### 3. `apps/mobile/src/screens/booking/hooks/useAvailableDates.ts`

**Purpose:** Check which of the next 14 days have available slots.

```typescript
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DateAvailability {
  date: string;       // "YYYY-MM-DD"
  dayLabel: string;   // "Seg", "Ter", etc.
  dayNumber: string;  // "24"
  monthLabel: string; // "Fev"
  hasSlots: boolean;
  isToday: boolean;
}

export function useAvailableDates(petshopId: string) {
  // Generate array of next 14 dates starting from today
  //
  // Use useQueries to fetch slots for each date in parallel:
  //   For each date, call supabase.rpc('get_available_slots', { p_petshop_id: petshopId, p_date: date })
  //   Mark hasSlots = (result.data?.length ?? 0) > 0
  //
  // Day labels in Portuguese: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  // Month labels in Portuguese: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  //
  // Helper to generate date string:
  //   const d = new Date(); d.setDate(d.getDate() + offset);
  //   return d.toISOString().split('T')[0]; // "YYYY-MM-DD"
  //
  // Return: { dates: DateAvailability[], isLoading: boolean }
}
```

### 4. `apps/mobile/src/screens/booking/hooks/useMultiPetDiscount.ts`

**Purpose:** Fetch multi-pet discount config for a petshop.

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useMultiPetDiscount(petshopId: string) {
  // useQuery:
  //   queryKey: ['multi-pet-discount', petshopId]
  //   queryFn:
  //     const { data } = await supabase
  //       .from('petshop_multi_pet_discount')
  //       .select('min_pets, discount_percent')
  //       .eq('petshop_id', petshopId)
  //       .order('min_pets', { ascending: true });
  //     return data || [];
  //
  //   staleTime: 10 * 60 * 1000
  //   enabled: !!petshopId
  //
  // Return: { discounts: { min_pets: number; discount_percent: number }[], isLoading }
  //
  // Helper: getBestDiscount(numPets: number) → returns highest applicable discount
  //   Filter discounts where min_pets <= numPets, take the one with highest min_pets
  //   Return { percent: discount_percent, minPets: min_pets } or null
}
```

### 5. `apps/mobile/src/screens/booking/hooks/useCreateBooking.ts`

**Purpose:** Create booking + booking_items in Supabase.

```typescript
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CreateBookingParams {
  petshopId: string;
  bookingDate: string;     // "YYYY-MM-DD"
  startTime: string;       // "HH:MM"
  endTime: string;         // "HH:MM"
  totalAmount: number;
  items: {
    petId: string;
    serviceId: string;
    price: number;
    durationMinutes: number;
  }[];
}

export function useCreateBooking() {
  const { user } = useAuth();

  // useMutation:
  //   mutationFn: async (params: CreateBookingParams) => {
  //     if (!user) throw new Error('Usuário não autenticado');
  //
  //     // 1. Create booking
  //     const { data: booking, error: bookingError } = await supabase
  //       .from('bookings')
  //       .insert({
  //         tutor_id: user.id,
  //         petshop_id: params.petshopId,
  //         booking_date: params.bookingDate,
  //         start_time: params.startTime,
  //         end_time: params.endTime,
  //         status: 'pending_payment',
  //         total_amount: params.totalAmount,
  //       })
  //       .select()
  //       .single();
  //
  //     if (bookingError) throw bookingError;
  //
  //     // 2. Create booking items
  //     const bookingItems = params.items.map(item => ({
  //       booking_id: booking.id,
  //       pet_id: item.petId,
  //       service_id: item.serviceId,
  //       price: item.price,
  //       duration_minutes: item.durationMinutes,
  //     }));
  //
  //     const { error: itemsError } = await supabase
  //       .from('booking_items')
  //       .insert(bookingItems);
  //
  //     if (itemsError) {
  //       // Rollback: delete the booking if items fail
  //       await supabase.from('bookings').delete().eq('id', booking.id);
  //       throw itemsError;
  //     }
  //
  //     return booking;
  //   }
  //
  // Return: { createBooking: mutate, isCreating: isPending, error }
}
```

### 6. `apps/mobile/src/screens/booking/steps/SelectPetsStep.tsx`

**Purpose:** Step 1 — Select 1 or more pets from user's pet list.

```
Props: none (uses useBooking context + usePets hook)

Implementation:
  const { pets } = usePets();
  const { state, dispatch } = useBooking();

  Toggle pet selection:
    - If pet is in selectedPets → remove it
    - If pet is not in selectedPets → add it (as SelectedPet: { id, name, size, photo_url })

Layout:
  - Title: "Selecione seus pets" fontSize 20, fontWeight 700, color #333, padding 16
  - Subtitle: "Escolha quais pets serão atendidos" fontSize 14, color #999
  - FlatList of pet cards:
    Each card (TouchableOpacity):
      - flexDirection row, alignItems center, padding 12
      - backgroundColor: selected ? '#FFF0F0' : '#fff', borderWidth 2
      - borderColor: selected ? '#FF6B6B' : '#ddd', borderRadius 12
      - marginBottom 8, marginHorizontal 16
      - Left: Pet photo (48x48 rounded) or placeholder circle with 🐾
      - Center (flex 1, marginLeft 12):
        - Name: fontSize 16, fontWeight 600, color #333
        - Info: "{species} • Porte {size}" fontSize 13, color #666
      - Right: Checkbox circle
        - selected: filled circle #FF6B6B with white ✓
        - unselected: empty circle border #ddd
  - Footer: "Continuar" button
    - Disabled if selectedPets.length === 0
    - onPress: dispatch({ type: 'NEXT_STEP' })

Validation: At least 1 pet must be selected to proceed.
```

### 7. `apps/mobile/src/screens/booking/steps/SelectServicesStep.tsx`

**Purpose:** Step 2 — For each selected pet, choose a main service + optional add-ons.

```
Props: none (uses useBooking context)

Implementation:
  const { state, dispatch } = useBooking();
  Fetch services for petshop:
    const { data: services } = useQuery({
      queryKey: ['petshop-services', state.petshopId],
      queryFn: () => supabase
        .from('services')
        .select('id, name, description, category, duration_minutes, is_addon, service_prices(size, price)')
        .eq('petshop_id', state.petshopId)
        .eq('is_active', true)
    });

  Separate services into:
    mainServices = services.filter(s => !s.is_addon)
    addonServices = services.filter(s => s.is_addon)

  For each pet in state.selectedPets:
    - Get pet's size
    - Get price for each service: service.service_prices.find(p => p.size === pet.size)?.price ?? 0

  When user selects a main service for a pet:
    dispatch({ type: 'SET_SERVICE', petId, service: { serviceId, serviceName, category, price, duration_minutes } })

  When user toggles an addon for a pet:
    dispatch({ type: 'TOGGLE_ADDON', petId, addon: { serviceId, serviceName, price, duration_minutes } })

Layout:
  - ScrollView
  - For each pet (section):
    - Pet header: photo + name + size badge, backgroundColor #f9f9f9, borderRadius 8, padding 12
    - "Serviço principal:" label, fontSize 14, fontWeight 600, marginTop 12
    - Service cards (RadioButton style — only ONE main service per pet):
      Each card (TouchableOpacity):
        - flexDirection row, justifyContent space-between, padding 12
        - borderWidth 1, borderRadius 8, marginBottom 8
        - Selected: borderColor #FF6B6B, backgroundColor #FFF0F0
        - Unselected: borderColor #ddd, backgroundColor #fff
        - Left: name (fontSize 15, fontWeight 600) + description (fontSize 12, color #999) + duration ("⏱ {min}min")
        - Right: "R$ {price}" fontSize 15, fontWeight 700, color #FF6B6B
        - Radio circle left of card: filled if selected
    - Separator
    - "Adicionais (opcional):" label, if addonServices.length > 0
    - Addon cards (checkbox toggle — multiple per pet):
      Same layout as service card but with checkbox instead of radio
      - Toggle: dispatch TOGGLE_ADDON

  - Footer: "Continuar" button
    - Disabled if any pet has no main service selected
    - Validation message if incomplete: "Selecione um serviço para cada pet"
    - onPress: dispatch({ type: 'NEXT_STEP' })
```

### 8. `apps/mobile/src/screens/booking/steps/SelectDateStep.tsx`

**Purpose:** Step 3 — Horizontal calendar strip showing next 14 days.

```
Props: none (uses useBooking context + useAvailableDates hook)

Implementation:
  const { state, dispatch } = useBooking();
  const { dates, isLoading } = useAvailableDates(state.petshopId);

  When user taps a date:
    if (date.hasSlots) dispatch({ type: 'SET_DATE', date: date.date })

Layout:
  - Title: "Escolha a data" fontSize 20, fontWeight 700, padding 16
  - FlatList horizontal:
    - showsHorizontalScrollIndicator false
    - contentContainerStyle: paddingHorizontal 12, gap 8
    - Each date item (TouchableOpacity):
      - width 70, alignItems center, paddingVertical 12, borderRadius 12
      - States:
        - selected: backgroundColor #FF6B6B
        - hasSlots (available): backgroundColor #fff, borderWidth 1, borderColor #ddd
        - !hasSlots (unavailable): backgroundColor #f0f0f0, opacity 0.5
        - isToday: add small dot indicator below
      - Day label: "Seg" fontSize 12, color: selected ? #fff : #666
      - Day number: "24" fontSize 20, fontWeight 700, color: selected ? #fff : #333
      - Month: "Fev" fontSize 11, color: selected ? #fff : #999
      - Disabled (not touchable) if !hasSlots
  - If isLoading: ActivityIndicator below calendar strip
  - Below calendar: if date selected, show "📅 {dayLabel}, {dayNumber} de {monthLabel}" confirmation

  - Footer: "Continuar" button
    - Disabled if no date selected
    - onPress: dispatch({ type: 'NEXT_STEP' })
```

### 9. `apps/mobile/src/screens/booking/steps/SelectTimeStep.tsx`

**Purpose:** Step 4 — Show available time slots for the selected date.

```
Props: none (uses useBooking context + useAvailableSlots hook)

Implementation:
  const { state, dispatch, totalDuration } = useBooking();
  const { slots, isLoading } = useAvailableSlots(state.petshopId, state.selectedDate);

  Multi-pet consecutive slots logic:
    If totalDuration > slotDuration (i.e., multiple pets needing consecutive time):
      Filter slots to only show start times where enough consecutive slots are available.

    function getValidStartSlots(slots: AvailableSlot[], totalDurationMinutes: number): AvailableSlot[] {
      if (slots.length === 0) return [];
      // Calculate slot duration from first slot
      const slotDuration = timeDiffMinutes(slots[0].slot_start, slots[0].slot_end);
      const slotsNeeded = Math.ceil(totalDurationMinutes / slotDuration);

      if (slotsNeeded <= 1) return slots;

      const validStarts: AvailableSlot[] = [];
      for (let i = 0; i <= slots.length - slotsNeeded; i++) {
        const group = slots.slice(i, i + slotsNeeded);
        // Check consecutive: each slot_start equals previous slot_end
        const isConsecutive = group.every((slot, idx) => {
          if (idx === 0) return true;
          return slot.slot_start === group[idx - 1].slot_end;
        });
        if (isConsecutive) validStarts.push(group[0]);
      }
      return validStarts;
    }

    function timeDiffMinutes(start: string, end: string): number {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      return (eh * 60 + em) - (sh * 60 + sm);
    }

  When user selects a slot:
    Calculate end time: add totalDuration minutes to slot.slot_start
    dispatch({ type: 'SET_SLOT', start: formatTime(slot.slot_start), end: calculatedEnd })

  formatTime helper: "HH:MM:SS" → "HH:MM"
    const formatTime = (t: string) => t.substring(0, 5);

Layout:
  - Title: "Escolha o horário" fontSize 20, fontWeight 700, padding 16
  - Subtitle showing selected date: "📅 {formatted date}"
  - If multi-pet: info banner
    - backgroundColor #FFF8E1, borderRadius 8, padding 12, marginHorizontal 16
    - Text: "⏱ {selectedPets.length} pets = {totalDuration}min. Horários com tempo consecutivo disponível."
    - fontSize 13, color #666
  - Loading: ActivityIndicator
  - No slots: "Nenhum horário disponível para esta data. Tente outra data."
  - FlatList of slots:
    - Each slot (TouchableOpacity):
      - flexDirection row, justifyContent space-between, alignItems center
      - padding 16, marginHorizontal 16, marginBottom 8
      - borderRadius 12, borderWidth 2
      - Selected: borderColor #FF6B6B, backgroundColor #FFF0F0
      - Available: borderColor #ddd, backgroundColor #fff
      - Left: time "08:00" fontSize 18, fontWeight 700, color #333
      - Right: "{available_spots} vaga(s)" fontSize 13, color #2ecc71
  - Footer: "Continuar" button
    - Disabled if no slot selected
    - onPress: dispatch({ type: 'NEXT_STEP' })
```

### 10. `apps/mobile/src/screens/booking/steps/ReviewStep.tsx`

**Purpose:** Step 5 — Booking summary with prices, discount, and confirm button.

```
Props: none (uses useBooking context)

Implementation:
  const { state, dispatch, subtotal, discountAmount, totalAmount, totalDuration } = useBooking();

Layout:
  - ScrollView, padding 16
  - Title: "Resumo do Agendamento" fontSize 20, fontWeight 700

  - Section 1: Pet Shop info
    - Card: backgroundColor #f9f9f9, borderRadius 12, padding 16, marginTop 16
    - Name: fontSize 16, fontWeight 700
    - Address: fontSize 13, color #666

  - Section 2: Date & Time
    - Card same style
    - "📅 {formatted date}" fontSize 15
    - "🕐 {startTime} - {endTime}" fontSize 15
    - "⏱ Duração total: {totalDuration}min" fontSize 13, color #666

  - Section 3: Pets & Services
    - For each pet:
      - Pet header: photo + name + size
      - Main service: name + "R$ {price}" (right aligned)
      - Add-ons (if any): "+ {addonName}" + "R$ {price}" each, indented, color #666
    - Separator between pets

  - Section 4: Price breakdown
    - Card same style
    - Row: "Subtotal" ←→ "R$ {subtotal.toFixed(2)}"
    - If discount:
      - Row: "Desconto multi-pet ({discount.percent}%)" ←→ "- R$ {discountAmount.toFixed(2)}" color #2ecc71
    - Divider line
    - Row: "Total" ←→ "R$ {totalAmount.toFixed(2)}" fontSize 18, fontWeight 700, color #FF6B6B

  - Section 5: Cancellation Policy
    - Card: backgroundColor #FFF8E1, borderRadius 8, padding 12, marginTop 16
    - Title: "Política de Cancelamento" fontWeight 600
    - Text: "Cancelamento gratuito até 2 horas antes do horário agendado. Após esse prazo, o valor será cobrado integralmente."
    - fontSize 12, color #666

  - Bottom spacer (height 100 for button)

  - Fixed bottom button: "Agendar e Pagar → R$ {totalAmount.toFixed(2)}"
    - Same style as BookButton from IPET-009
    - backgroundColor #FF6B6B, borderRadius 12, paddingVertical 16
    - onPress: handleConfirmBooking
      1. Call createBooking mutation with all data
      2. On success: navigate to checkout (IPET-011) OR show success alert for now
         - For now (IPET-011 not implemented):
           Alert.alert('Agendamento Criado!', 'Seu agendamento foi criado. O pagamento será implementado em breve.',
             [{ text: 'OK', onPress: () => navigation.navigate('Home') }])
      3. On error: Alert.alert('Erro', 'Não foi possível criar o agendamento. Tente novamente.')
```

### 11. `apps/mobile/src/screens/booking/BookingFlowScreen.tsx`

**Purpose:** Container screen that manages step navigation.

```typescript
import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/RootNavigator';
import { BookingProvider, useBooking } from './context/BookingContext';
import { useMultiPetDiscount } from './hooks/useMultiPetDiscount';
import { SelectPetsStep } from './steps/SelectPetsStep';
import { SelectServicesStep } from './steps/SelectServicesStep';
import { SelectDateStep } from './steps/SelectDateStep';
import { SelectTimeStep } from './steps/SelectTimeStep';
import { ReviewStep } from './steps/ReviewStep';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingFlow'>;

// This screen receives params: { petshopId: string; petshopName: string; petshopAddress: string }
//
// Implementation:
//   Wrap content with <BookingProvider>
//   Inside provider, render <BookingFlowContent />
//
// BookingFlowContent component:
//   const { state, dispatch } = useBooking();
//   const { petshopId, petshopName, petshopAddress } = route.params;
//
//   useEffect on mount:
//     dispatch({ type: 'SET_PETSHOP', petshopId, petshopName, petshopAddress })
//
//   Fetch multi-pet discount:
//     const { discounts } = useMultiPetDiscount(petshopId);
//     When selectedPets.length changes:
//       Find best discount for selectedPets.length
//       dispatch({ type: 'SET_DISCOUNT', discount: bestDiscount })
//
//   Step progress bar at top:
//     - 5 dots connected by lines
//     - Active dot: backgroundColor #FF6B6B, width 12, height 12, borderRadius 6
//     - Completed dot: backgroundColor #FF6B6B, width 10, height 10, borderRadius 5
//     - Inactive dot: backgroundColor #ddd, width 10, height 10, borderRadius 5
//     - Line between dots: height 2, flex 1, backgroundColor: completed ? #FF6B6B : #ddd
//
//   Back button (top-left or hardware back):
//     if step > 1: dispatch({ type: 'PREV_STEP' })
//     else: navigation.goBack()
//
//   Render current step:
//     switch (state.step):
//       case 1: <SelectPetsStep />
//       case 2: <SelectServicesStep />
//       case 3: <SelectDateStep />
//       case 4: <SelectTimeStep />
//       case 5: <ReviewStep />
//
//   Step labels for header:
//     ['Pets', 'Serviços', 'Data', 'Horário', 'Resumo']

// Styles:
//   container: flex 1, backgroundColor #fff
//   progressBar: flexDirection row, alignItems center, paddingHorizontal 24, paddingVertical 12
```

## Files to Modify

### 12. `apps/mobile/src/navigation/RootNavigator.tsx`

**Changes:**

1. Import:
```typescript
import { BookingFlowScreen } from '../screens/booking/BookingFlowScreen';
```

2. Add to `MainStackParamList`:
```typescript
export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  MyPets: undefined;
  AddPet: { petId?: string; editingPet?: Pet };
  PetDetail: { petId: string };
  PetShopProfile: { petshopId: string; distance?: number };
  AllReviews: { petshopId: string; petshopName: string };
  BookingFlow: { petshopId: string; petshopName: string; petshopAddress: string };  // ADD
};
```

3. Add screen to `MainNavigator`:
```tsx
<MainStack.Screen
  name="BookingFlow"
  component={BookingFlowScreen}
  options={{ headerTitle: 'Agendar', headerBackTitle: 'Voltar' }}
/>
```

### 13. `apps/mobile/src/screens/petshop/components/BookButton.tsx`

**Changes:** Wire "Agendar" button to navigate to BookingFlow.

Current `onPress` just calls the passed prop. Now the parent (`PetShopProfileScreen.tsx`) needs to pass navigation params.

### 14. `apps/mobile/src/screens/petshop/PetShopProfileScreen.tsx`

**Changes:** Update `handleBook` to navigate with params:

```typescript
const handleBook = () => {
  if (!profile) return;
  navigation.navigate('BookingFlow', {
    petshopId: profile.id,
    petshopName: profile.name,
    petshopAddress: `${profile.address}, ${profile.city} - ${profile.state}`,
  });
};
```

## Implementation Order

1. **Context:** `BookingContext.tsx` (foundation for all steps)
2. **Hooks:** `useAvailableSlots.ts` → `useAvailableDates.ts` → `useMultiPetDiscount.ts` → `useCreateBooking.ts`
3. **Steps:** `SelectPetsStep` → `SelectServicesStep` → `SelectDateStep` → `SelectTimeStep` → `ReviewStep`
4. **Container:** `BookingFlowScreen.tsx`
5. **Navigation:** Update `RootNavigator.tsx`
6. **Wiring:** Update `PetShopProfileScreen.tsx` + `BookButton.tsx`

## Validation Rules

| Field | Rule |
|-------|------|
| selectedPets | At least 1 pet required |
| selectedServices | Exactly 1 main service per pet required |
| selectedDate | Required, must be within next 14 days |
| selectedSlot | Required, must be available from RPC |
| totalAmount | > 0, calculated as subtotal - discount |
| booking status | Always 'pending_payment' on creation |
| consecutive slots | Multi-pet requires N consecutive available slots |

## Testing Checklist

After implementation, verify:
- [ ] Selecionar 1 pet e 1 serviço funciona
- [ ] Selecionar 2+ pets com serviços diferentes funciona
- [ ] Preço calculado corretamente por porte de cada pet
- [ ] Add-ons adicionam ao preço total por pet
- [ ] Desconto multi-pet aplicado quando petshop tem configuração
- [ ] Desconto NÃO aplicado quando petshop não tem configuração
- [ ] Calendário mostra próximos 14 dias
- [ ] Dias sem slots ficam desabilitados (opacity 0.5)
- [ ] Multi-pet mostra apenas horários com slots consecutivos suficientes
- [ ] Single-pet mostra todos os slots disponíveis
- [ ] Resumo mostra todos os dados corretos (pets, serviços, preços, total)
- [ ] Política de cancelamento aparece no resumo
- [ ] Booking criado no Supabase com status 'pending_payment'
- [ ] Booking items criados com pet_id + service_id + price + duration corretos
- [ ] Back navigation entre steps funciona (step 3 → step 2, etc.)
- [ ] Progress bar atualiza conforme step atual
- [ ] Botão "Continuar" disabled quando step incompleto
- [ ] TypeScript compila sem erros: `cd apps/mobile && npx tsc --noEmit`

## Git Commit

After all files pass validation:
```bash
git add apps/mobile/src/screens/booking/ apps/mobile/src/navigation/RootNavigator.tsx apps/mobile/src/screens/petshop/PetShopProfileScreen.tsx apps/mobile/src/screens/petshop/components/BookButton.tsx
git commit -m "feat: implement booking flow IPET-010

- 5-step booking: select pets → services → date → time → review
- React Context + useReducer for flow state management
- Consecutive slot validation for multi-pet bookings
- Multi-pet discount support from petshop config
- Available slots via get_available_slots RPC (IPET-008)
- 14-day calendar strip with availability check
- Booking + booking_items created with pending_payment status
- Hooks: useAvailableSlots, useAvailableDates, useMultiPetDiscount, useCreateBooking"
```

## Important Notes

- **NO new migrations** — all tables (bookings, booking_items, petshop_multi_pet_discount) already exist
- Follow EXACT same patterns as existing hooks and screens
- Import supabase from `@/lib/supabase`
- Use React Native `StyleSheet.create()` — NO Tailwind
- Use `@react-navigation/native-stack` types
- Colors: `#FF6B6B` primary, `#333` text, `#666`/`#999` muted, `#f0f0f0` bg
- Prices in BRL: "R$ 45,00" format (use toFixed(2))
- Dates in Brazilian format: DD/MM/YYYY
- Times in 24h: HH:MM
- Booking status on creation is ALWAYS 'pending_payment' (payment is IPET-011)
- Timeout/auto-cancel of pending bookings is a backend concern (not this story)
- BookingContext provider wraps BookingFlowScreen content only (not global)
