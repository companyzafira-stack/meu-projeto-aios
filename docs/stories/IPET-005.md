---
story_id: IPET-005
status: In Review
epic: App Tutor
priority: Critical
feature_section: F1 (Onboarding - Cadastro de Pet)
acceptance_criteria:
  - Tutor cadastra pet com nome, espécie, raça, porte, idade, foto
  - Foto é comprimida antes de upload
  - Tutor pode ter até 5 pets
  - CRUD completo (criar, ler, editar, deletar)
scope: Both
dependencies:
  - IPET-003
constraints:
  - "Foto max 5MB, compressão automática"
  - "expo-image-picker para câmera/galeria"
  - "Supabase Storage para fotos"
estimates_days: 2
---

# Pet Registration (CRUD + Photo) — IPET-005

## Summary
Após autenticação, tutor cadastra seus pets com foto. Primeiro pet é obrigatório antes de acessar o app. CRUD completo com compressão de imagem.

## User Story
As a tutor,
I want to register my pets with name, breed, size, and photo,
So that I can book services specific to each pet.

## Acceptance Criteria
- [x] Após primeiro login, tutor é direcionado para cadastrar primeiro pet (obrigatório)
- [x] Form: nome (obrigatório), espécie (dropdown: Cão/Gato), raça (texto), porte (P/M/G/GG), idade em meses (opcional), foto
- [x] Foto: botão para câmera ou galeria (expo-image-picker)
- [x] Foto é comprimida para <1MB antes de upload (expo-image-manipulator)
- [x] Foto salva no Supabase Storage, URL referenciada na tabela pets
- [x] Após cadastrar primeiro pet, tutor acessa Home
- [x] Tela "Meus Pets": lista todos os pets com foto, nome, raça, porte
- [x] Botão "+" para adicionar novo pet (máximo 5)
- [x] Toque no pet abre detalhes com opção de editar ou excluir
- [x] Confirmar antes de excluir ("Tem certeza que deseja remover Rex?")
- [x] Mensagem de erro se tentar cadastrar mais de 5 pets

## Technical Details

### Dependencies
```bash
npx expo install expo-image-picker expo-image-manipulator
```

### Image Compression
```typescript
// apps/mobile/src/utils/imageCompression.ts
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

### Supabase Storage Upload
```typescript
// apps/mobile/src/lib/storage.ts
export async function uploadPetPhoto(userId: string, petId: string, uri: string) {
  const fileName = `${userId}/${petId}.jpg`;
  const formData = new FormData();
  formData.append('file', { uri, name: fileName, type: 'image/jpeg' });

  const { data, error } = await supabase.storage
    .from('pet-avatars')
    .upload(fileName, formData, { upsert: true });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('pet-avatars')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

### Screens
```
src/screens/pets/
├── AddPetScreen.tsx      — Form de cadastro
├── MyPetsScreen.tsx       — Lista de pets (tab "Meus Pets")
├── PetDetailScreen.tsx    — Detalhes + editar/excluir
└── EditPetScreen.tsx      — Form de edição (reaproveita AddPetScreen)
```

### API Calls
```typescript
// CRUD via Supabase
const createPet = (pet) => supabase.from('pets').insert(pet);
const getPets = (userId) => supabase.from('pets').select('*').eq('user_id', userId);
const updatePet = (id, pet) => supabase.from('pets').update(pet).eq('id', id);
const deletePet = (id) => supabase.from('pets').delete().eq('id', id);
```

## Testing
- [x] Cadastrar pet com todos os campos funciona
- [x] Foto da câmera é comprimida e salva no Storage
- [x] Foto da galeria é comprimida e salva no Storage
- [x] Foto aparece corretamente na lista e no detalhe
- [x] Editar pet atualiza dados no banco
- [x] Excluir pet remove do banco e da lista
- [x] Limite de 5 pets é respeitado
- [x] Validação: nome obrigatório, porte obrigatório, espécie obrigatória
- [x] Primeiro pet redireciona para Home após cadastro

## File List

### Created
- `apps/mobile/src/hooks/usePets.ts` — Pet CRUD hook with Supabase integration
- `apps/mobile/src/hooks/useUserPets.ts` — Hook to check if user has pets
- `apps/mobile/src/lib/storage.ts` — Supabase Storage upload/delete operations
- `apps/mobile/src/utils/imageCompression.ts` — Image compression utility (<1MB)
- `apps/mobile/src/screens/pets/AddPetScreen.tsx` — Form for create/edit pet with photo picker
- `apps/mobile/src/screens/pets/MyPetsScreen.tsx` — List all pets with FAB (+) button
- `apps/mobile/src/screens/pets/PetDetailScreen.tsx` — Pet details with edit/delete options

### Updated
- `apps/mobile/src/navigation/RootNavigator.tsx` — Added pet screens, onboarding flow, conditional navigation
- `apps/mobile/src/screens/main/HomeScreen.tsx` — Added "Meus Pets" button

### Dependencies Added
- `expo-image-picker@^15.0.x` — Camera and gallery image selection
- `expo-image-manipulator@^13.0.x` — Image compression and resizing

## Notes
- Supabase Storage: criar bucket 'pet-avatars' com public access
- RLS do Storage: user pode upload/delete apenas no próprio path (userId/)
- Considerar placeholder image se tutor não tirar foto

## Related Stories
- Bloqueada por: IPET-003 (Auth)
- Usada por: IPET-010 (Booking — selecionar pets)
