# IPET-015 SPEC — Photo Upload Post-Service (Codex Execution)

## Context
You are working on IPET, a pet services marketplace. IPET-001 to IPET-014 are implemented. This spec covers IPET-015: photo upload when pet shop completes a service, plus tutor-side photo viewing and pet photo timeline.

**Tech stack (web):** Next.js 14 App Router, TypeScript strict, Tailwind CSS, Supabase client at `@/lib/supabase`, Lucide React icons.

**Tech stack (mobile):** Expo 51, React Native 0.74, TypeScript, TanStack React Query 5, Supabase JS 2.45.

**Existing:** `booking_photos` table already exists. No migrations needed.

## Existing Database Schema

```sql
-- booking_photos (already exists)
CREATE TABLE public.booking_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- bookings: id, tutor_id, petshop_id, booking_date, status, ...
-- booking_items: id, booking_id, pet_id, service_id, price, duration_minutes
-- pets: id, user_id, name, species, size, photo_url
-- services: id, name, category
```

## Supabase Storage Setup

**Bucket:** `booking-photos` (public access for reading, auth required for upload).

Create via Supabase Dashboard or migration:
```sql
-- Run in Supabase SQL Editor (storage buckets can't be created via normal migrations)
INSERT INTO storage.buckets (id, name, public) VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: petshop owners can upload to their own folder
CREATE POLICY "Petshop can upload booking photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'booking-photos');

CREATE POLICY "Anyone can view booking photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'booking-photos');
```

**File path pattern:** `{petshop_id}/{booking_id}/{index}.jpg`

## Files to Create

### 1. `apps/web/src/utils/imageCompression.ts`

**Purpose:** Client-side image compression using canvas.

```typescript
// Compress image to max 1200px width, JPEG 75% quality
// Returns Blob < 1MB

export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          resolve(blob);
        },
        'image/jpeg',
        0.75
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// Validate file: must be image, max 5MB before compression
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Arquivo deve ser uma imagem';
  if (file.size > 5 * 1024 * 1024) return 'Imagem deve ter no máximo 5MB';
  return null;
}
```

### 2. `apps/web/src/hooks/useBookingPhotos.ts`

**Purpose:** Upload photos to Supabase Storage + insert in booking_photos.

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { compressImage, validateImageFile } from '@/utils/imageCompression';

export function useBookingPhotos(petshopId: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Upload multiple photos for a booking
  // Returns array of public URLs
  const uploadPhotos = async (bookingId: string, files: File[]): Promise<string[]> => {
    setUploading(true);
    setError('');
    const urls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        // Validate
        const validationError = validateImageFile(files[i]);
        if (validationError) throw new Error(validationError);

        // Compress
        const compressed = await compressImage(files[i]);

        // Upload to Storage
        const path = `${petshopId}/${bookingId}/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('booking-photos')
          .upload(path, compressed, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('booking-photos')
          .getPublicUrl(path);

        // Insert in booking_photos table
        const { error: insertError } = await supabase
          .from('booking_photos')
          .insert({ booking_id: bookingId, photo_url: urlData.publicUrl });

        if (insertError) throw insertError;

        urls.push(urlData.publicUrl);
      }

      return urls;
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { uploadPhotos, uploading, error };
}
```

### 3. `apps/web/src/app/(dashboard)/agendamentos/components/PhotoUploadModal.tsx`

**Purpose:** Modal for uploading 1-3 photos before completing a booking.

```
'use client';

Props:
  isOpen: boolean
  onClose: () => void
  bookingId: string
  petshopId: string
  onComplete: () => void  // called after upload + status change

Implementation:
  const { uploadPhotos, uploading } = useBookingPhotos(petshopId);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);  // data URLs for preview
  const [completing, setCompleting] = useState(false);

  handleFileSelect(event):
    const files = Array.from(event.target.files);
    const total = selectedFiles.length + files.length;
    if (total > 3) { alert('Máximo 3 fotos'); return; }
    Validate each file (validateImageFile)
    Add to selectedFiles
    Generate preview URLs: URL.createObjectURL(file)
    Add to previews

  handleRemovePhoto(index):
    Remove from selectedFiles and previews at index
    URL.revokeObjectURL(previews[index])

  handleConfirm:
    if (selectedFiles.length === 0) { alert('Adicione ao menos 1 foto'); return; }
    setCompleting(true);
    try {
      1. Upload photos
      await uploadPhotos(bookingId, selectedFiles);
      2. Change booking status to completed
      await supabase.from('bookings').update({
        status: 'completed', updated_at: new Date().toISOString()
      }).eq('id', bookingId);
      3. Send notification
      await fetch('/api/bookings/status-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, newStatus: 'completed' }),
      });
      4. onComplete()
    } catch (err) { alert('Erro ao concluir atendimento'); }
    finally { setCompleting(false); }

Layout (Tailwind):
  - Overlay: fixed inset-0 bg-black/50 z-50 flex items-center justify-center
  - Modal: bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto

  - Title: "Concluir Atendimento" text-xl font-bold
  - Subtitle: "Adicione fotos do resultado (1-3 fotos)" text-sm text-gray-500

  - Photo grid (grid grid-cols-3 gap-3 mt-4):
    For each preview:
      - Relative container: aspect-square rounded-lg overflow-hidden border-2 border-gray-200
      - Image: object-cover w-full h-full
      - Remove button: absolute top-1 right-1, bg-red-500 text-white rounded-full w-6 h-6
        Text "✕" onClick → handleRemovePhoto(index)

    If selectedFiles.length < 3:
      - Add photo button: aspect-square rounded-lg border-2 border-dashed border-gray-300
        flex items-center justify-center cursor-pointer hover:border-[#FF6B6B]
        - Icon: Camera (lucide) w-8 h-8 text-gray-400
        - Text: "Adicionar" text-xs text-gray-400
        - Hidden file input: accept="image/*" capture="environment" (opens camera on mobile browser)
          onChange → handleFileSelect

  - Info text: "📸 As fotos serão enviadas ao tutor" text-xs text-gray-400 mt-3

  - Buttons (flex gap-3 mt-6):
    - "Cancelar": border border-gray-300 text-gray-600 px-4 py-2 rounded-lg
      onClick: onClose (cleanup previews)
    - "Concluir Atendimento": bg-green-600 text-white px-4 py-2 rounded-lg
      disabled if selectedFiles.length === 0 || completing || uploading
      Shows spinner if completing
      onClick: handleConfirm
```

### 4. `apps/mobile/src/screens/booking/BookingPhotosScreen.tsx`

**Purpose:** View photos from a specific booking. Opened from notification tap or pet timeline.

```
Route: 'BookingPhotos'
Params: { bookingId: string }

Implementation:
  Fetch booking with photos:
    const { data } = useQuery({
      queryKey: ['booking-photos', bookingId],
      queryFn: () => supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time,
          petshops:petshop_id(name),
          booking_items(pets:pet_id(name), services:service_id(name)),
          booking_photos(id, photo_url, uploaded_at)
        `)
        .eq('id', bookingId)
        .single()
    });

Layout (ScrollView):
  - Header info card: bg #f9f9f9, borderRadius 12, padding 16, marginHorizontal 16, marginTop 16
    - Pet shop name: fontSize 16, fontWeight 700
    - Date: "📅 {DD/MM/YYYY} às {HH:MM}"
    - Pets & services: "{pet.name} — {service.name}" for each item

  - Photos section (marginTop 20):
    - If no photos: "Nenhuma foto disponível" centered text
    - Photos grid (2 columns):
      FlatList numColumns={2}, columnWrapperStyle gap 8, padding 16
      Each photo:
        - TouchableOpacity → open full screen image (optional, or just large display)
        - Image: width (screenWidth - 48) / 2, aspectRatio 1, borderRadius 12
        - backgroundColor #f0f0f0 as placeholder

  - Share section (marginTop 16, paddingHorizontal 16):
    - "Compartilhar" button: outline, borderColor #FF6B6B, color #FF6B6B
      - TODO: Share.share() with photo URL (nice-to-have, can skip for MVP)

Styling: StyleSheet.create({...})
```

### 5. `apps/mobile/src/screens/pets/components/PetPhotoTimeline.tsx`

**Purpose:** Timeline of photos for a specific pet, organized by date.

```
Props:
  petId: string

Implementation:
  Fetch booking photos for this pet:
    const { data } = useQuery({
      queryKey: ['pet-photo-timeline', petId],
      queryFn: async () => {
        // Get all bookings for this pet with photos
        const { data: items } = await supabase
          .from('booking_items')
          .select(`
            booking_id,
            services:service_id(name),
            bookings:booking_id(
              booking_date, start_time, status,
              petshops:petshop_id(name),
              booking_photos(id, photo_url, uploaded_at)
            )
          `)
          .eq('pet_id', petId)
          .eq('bookings.status', 'completed');

        // Flatten and sort by date descending
        // Filter out bookings with no photos
        // Return: { date, petshopName, serviceName, photos[] }[]
      }
    });

Layout:
  - If no data or empty: null (don't render section)
  - Title: "Histórico de Fotos" fontSize 18, fontWeight 700, color #333, marginTop 24

  - Timeline entries:
    For each entry (sorted by date desc):
      - Date header: "📅 {DD/MM/YYYY}" fontSize 13, fontWeight 600, color #666, marginTop 16
      - Sub: "{petshopName} — {serviceName}" fontSize 12, color #999
      - Photos: FlatList horizontal, showsHorizontalScrollIndicator false
        Each photo: Image width 140, height 140, borderRadius 8, marginRight 8, marginTop 8
        TouchableOpacity → navigate to BookingPhotos screen

  - "Ver mais" button if > 5 entries (optional, pagination)
```

## Files to Modify

### 6. `apps/web/src/app/(dashboard)/agendamentos/components/ActionButtons.tsx`

**Changes:** "Concluir" now opens PhotoUploadModal instead of directly changing status.

Replace the "Concluir" button onClick:
```typescript
// Before: onClick: onAction(booking.id, 'completed')
// After:
// Add state: const [showPhotoModal, setShowPhotoModal] = useState(false);

// "Concluir" button → onClick: setShowPhotoModal(true)

// Add PhotoUploadModal:
// {showPhotoModal && (
//   <PhotoUploadModal
//     isOpen={showPhotoModal}
//     onClose={() => setShowPhotoModal(false)}
//     bookingId={booking.id}
//     petshopId={booking.petshop_id}
//     onComplete={() => {
//       setShowPhotoModal(false);
//       onAction(booking.id, 'completed'); // triggers refetch via realtime
//     }}
//   />
// )}

// Import PhotoUploadModal at top
```

NOTE: The PhotoUploadModal handles both upload AND status change + notification internally. The `onAction` call in onComplete is just for UI refresh/optimistic update.

Actually, simplify: PhotoUploadModal already does status change + notification. So `onComplete` should just close modal — Realtime will refresh the list.

```typescript
onComplete={() => { setShowPhotoModal(false); }}
```

### 7. `apps/mobile/src/screens/pets/PetDetailScreen.tsx`

**Changes:** Add PetPhotoTimeline section below pet info.

```typescript
// Import:
import { PetPhotoTimeline } from './components/PetPhotoTimeline';

// Add below existing pet detail content (before delete button area):
<PetPhotoTimeline petId={pet.id} />
```

### 8. `apps/mobile/src/navigation/RootNavigator.tsx`

**Changes:** Add BookingPhotos screen.

1. Import:
```typescript
import { BookingPhotosScreen } from '../screens/booking/BookingPhotosScreen';
```

2. Add to `MainStackParamList`:
```typescript
BookingPhotos: { bookingId: string };
```

3. Add screen:
```tsx
<MainStack.Screen name="BookingPhotos" component={BookingPhotosScreen}
  options={{ headerTitle: 'Fotos do Atendimento' }} />
```

### 9. `apps/mobile/src/hooks/usePushNotifications.ts`

**Changes:** Handle notification tap for booking_completed → navigate to BookingPhotos.

Update the responseListener to handle navigation:

```typescript
// In the responseListener callback:
const data = response.notification.request.content.data;

if (data?.type === 'booking_completed' && data?.bookingId) {
  // Navigate to booking photos
  // Use a global navigation ref or event emitter
  // For now, store in a ref that the navigator can check
  // This will be properly wired when navigation ref is set up
}
```

NOTE: Full deep-link navigation from background notifications is complex. For MVP, the NotificationCenterScreen tap handler (IPET-013) already navigates. This just ensures the data payload includes bookingId.

## Storage Bucket Setup

**IMPORTANT:** The `booking-photos` bucket must be created in Supabase Dashboard before running:

1. Go to Supabase Dashboard → Storage
2. Create bucket: `booking-photos`
3. Set as **Public** (for read access)
4. Add policies:
   - INSERT: authenticated users can upload
   - SELECT: anyone can view

Or run this SQL in Supabase SQL Editor:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-photos', 'booking-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users can upload booking photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'booking-photos');

CREATE POLICY "Public can view booking photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'booking-photos');
```

## Implementation Order

1. **Storage:** Create `booking-photos` bucket (manual or SQL)
2. **Web utils:** `imageCompression.ts`
3. **Web hook:** `useBookingPhotos.ts`
4. **Web component:** `PhotoUploadModal.tsx`
5. **Web wiring:** Update `ActionButtons.tsx` ("Concluir" → modal)
6. **Mobile screens:** `BookingPhotosScreen.tsx`
7. **Mobile component:** `PetPhotoTimeline.tsx`
8. **Mobile wiring:** Update `PetDetailScreen.tsx` + `RootNavigator.tsx`

## Validation Rules

| Field | Rule |
|-------|------|
| Photos per booking | Min 1, max 3 |
| File type | Must be image/* |
| File size | Max 5MB before compression |
| Compressed output | JPEG, 75% quality, max 1200px width |
| Storage path | `{petshopId}/{bookingId}/{timestamp}_{index}.jpg` |
| booking_photos.photo_url | Public URL from Supabase Storage |

## Testing Checklist

After implementation, verify:
- [ ] "Concluir" button opens PhotoUploadModal (not direct status change)
- [ ] File input accepts images, opens camera on mobile browser (capture="environment")
- [ ] Upload 1 photo → completes successfully
- [ ] Upload 3 photos → completes successfully
- [ ] Trying 4th photo → shows "Máximo 3 fotos" alert
- [ ] Non-image file → shows validation error
- [ ] File > 5MB → shows validation error
- [ ] Image compression reduces size (visible in network tab)
- [ ] Preview shows selected photos before confirming
- [ ] Remove individual photo works (X button)
- [ ] "Concluir Atendimento" uploads photos + changes status + sends notification
- [ ] Photos saved in Supabase Storage at correct path
- [ ] booking_photos rows created with correct URLs
- [ ] Push notification sent to tutor on completion
- [ ] Mobile: BookingPhotosScreen shows photos for a booking
- [ ] Mobile: PetPhotoTimeline shows photo history on PetDetailScreen
- [ ] Mobile: Timeline sorted by date descending
- [ ] Mobile: Tap photo in timeline navigates to BookingPhotosScreen
- [ ] Empty state: pet with no completed bookings shows no timeline
- [ ] TypeScript compiles: `cd apps/web && npx tsc --noEmit` + `cd apps/mobile && npx tsc --noEmit`

## Git Commit

```bash
git add apps/web/src/utils/imageCompression.ts apps/web/src/hooks/useBookingPhotos.ts apps/web/src/app/\(dashboard\)/agendamentos/components/PhotoUploadModal.tsx apps/web/src/app/\(dashboard\)/agendamentos/components/ActionButtons.tsx apps/mobile/src/screens/booking/BookingPhotosScreen.tsx apps/mobile/src/screens/pets/components/PetPhotoTimeline.tsx apps/mobile/src/screens/pets/PetDetailScreen.tsx apps/mobile/src/navigation/RootNavigator.tsx
git commit -m "feat: implement photo upload post-service IPET-015

- PhotoUploadModal: 1-3 photos required before completing booking
- Client-side image compression (canvas, JPEG 75%, max 1200px)
- Supabase Storage upload to booking-photos bucket
- BookingPhotosScreen: view photos from a completed booking
- PetPhotoTimeline: photo history on pet detail screen
- 'Concluir' button now requires photo upload before status change
- Push notification with photo data sent to tutor on completion"
```

## Important Notes

- **NO database migrations** — `booking_photos` table already exists
- **Storage bucket** must be created manually in Supabase Dashboard (or via SQL Editor)
- **`capture="environment"`** on file input opens rear camera on mobile browsers (tablet use case)
- **Image compression** uses HTML5 Canvas — works in all modern browsers
- **Public bucket** means photos are accessible via URL without auth — acceptable for pet photos
- **PhotoUploadModal handles everything:** upload + status change + notification. ActionButtons just opens/closes it.
- **Timeline query** joins booking_items → bookings → booking_photos. Only shows completed bookings with photos.
- **Share functionality** is nice-to-have (viral feature) — can be added later with `Share.share()` React Native API
