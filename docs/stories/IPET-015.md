---
story_id: IPET-015
status: Pending
epic: Dashboard Pet Shop + App Tutor
priority: High
feature_section: F6.5 + F12.3 (Fotos pós-serviço)
acceptance_criteria:
  - Pet shop faz upload de 1-3 fotos ao concluir
  - Fotos comprimidas antes de upload
  - Tutor recebe push com preview da foto
  - Histórico visual no perfil do pet
scope: Both
dependencies:
  - IPET-014
constraints:
  - "Max 3 fotos, 5MB cada, compressão automática"
  - "Supabase Storage bucket 'booking-photos'"
estimates_days: 2
---

# Photo Upload Post-Service — IPET-015

## Summary
Pet shop tira fotos do pet após o serviço. Ao concluir atendimento, upload é obrigatório (mínimo 1 foto). Tutor recebe push com preview. Fotos ficam no histórico do pet.

## User Story
As a pet shop owner,
I want to take photos of the pet after grooming,
So that the tutor can see the result and share it.

## Acceptance Criteria
- [ ] Dashboard: botão "Concluir" exige ao menos 1 foto antes de confirmar
- [ ] Upload via: file input (desktop) ou câmera (tablet/mobile browser)
- [ ] Máximo 3 fotos por atendimento
- [ ] Fotos comprimidas para <1MB antes de upload (client-side)
- [ ] Preview das fotos antes de confirmar conclusão
- [ ] Remover foto individual antes de confirmar
- [ ] Após confirmar: fotos salvas no Supabase Storage (`booking-photos/{petshop_id}/{booking_id}/`)
- [ ] URLs salvas na tabela `booking_photos`
- [ ] Push notification ao tutor: "[Pet] está pronto! Veja como ficou 🐾" com data payload contendo photo_url
- [ ] App tutor: tocar na notificação abre tela com fotos do booking
- [ ] App tutor: aba "Meus Pets" → perfil do pet → seção "Histórico de Fotos" com timeline visual
- [ ] Timeline: fotos organizadas por data, mostrando pet shop e serviço

## Technical Details

### Image Compression (Web/Dashboard)
```typescript
// apps/web/src/utils/imageCompression.ts
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const img = new Image();
    img.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.75);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

### Upload to Supabase Storage
```typescript
async function uploadBookingPhotos(petshopId, bookingId, files) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const compressed = await compressImage(files[i]);
    const path = `${petshopId}/${bookingId}/${i}.jpg`;
    await supabase.storage.from('booking-photos').upload(path, compressed);
    const { data } = supabase.storage.from('booking-photos').getPublicUrl(path);
    urls.push(data.publicUrl);
    await supabase.from('booking_photos').insert({ booking_id: bookingId, photo_url: data.publicUrl });
  }
  return urls;
}
```

### Pet Photo Timeline (App)
```
src/screens/pets/
├── PetPhotoTimeline.tsx    — Timeline de fotos por pet
└── BookingPhotosScreen.tsx — Fotos de um booking específico
```

## Testing
- [ ] Upload de 1 foto funciona
- [ ] Upload de 3 fotos funciona
- [ ] 4ª foto é rejeitada
- [ ] Compressão reduz tamanho (>5MB → <1MB)
- [ ] Preview mostra fotos antes de confirmar
- [ ] Remover foto individual funciona
- [ ] Push enviado ao tutor com preview
- [ ] App: tocar notificação abre fotos
- [ ] App: timeline do pet mostra fotos organizadas por data
- [ ] Fotos carregam rápido (lazy loading)

## File List
*Auto-maintained*

## Notes
- Supabase Storage: criar bucket 'booking-photos' com public access
- Estimar storage: ~2.25GB/mês (3 fotos × 1MB × 25/dia × 30 dias)
- Supabase Pro ($25/mês) = 100GB, suficiente para 40+ meses
- Considerar thumbnail generation para timeline (resize 200x200)

## Related Stories
- Bloqueada por: IPET-014 (Booking Status)
- Diferenciador viral: tutor compartilha foto no Instagram/WhatsApp
