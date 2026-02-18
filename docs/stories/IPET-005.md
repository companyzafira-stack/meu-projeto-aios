---
story_id: IPET-005
status: Pending
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
- [ ] Após primeiro login, tutor é direcionado para cadastrar primeiro pet (obrigatório)
- [ ] Form: nome (obrigatório), espécie (dropdown: Cão/Gato), raça (texto), porte (P/M/G/GG), idade em meses (opcional), foto
- [ ] Foto: botão para câmera ou galeria (expo-image-picker)
- [ ] Foto é comprimida para <1MB antes de upload (expo-image-manipulator)
- [ ] Foto salva no Supabase Storage, URL referenciada na tabela pets
- [ ] Após cadastrar primeiro pet, tutor acessa Home
- [ ] Tela "Meus Pets": lista todos os pets com foto, nome, raça, porte
- [ ] Botão "+" para adicionar novo pet (máximo 5)
- [ ] Toque no pet abre detalhes com opção de editar ou excluir
- [ ] Confirmar antes de excluir ("Tem certeza que deseja remover Rex?")
- [ ] Mensagem de erro se tentar cadastrar mais de 5 pets

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
- [ ] Cadastrar pet com todos os campos funciona
- [ ] Foto da câmera é comprimida e salva no Storage
- [ ] Foto da galeria é comprimida e salva no Storage
- [ ] Foto aparece corretamente na lista e no detalhe
- [ ] Editar pet atualiza dados no banco
- [ ] Excluir pet remove do banco e da lista
- [ ] Limite de 5 pets é respeitado
- [ ] Validação: nome obrigatório, porte obrigatório, espécie obrigatória
- [ ] Primeiro pet redireciona para Home após cadastro

## File List
*Auto-maintained*

## Notes
- Supabase Storage: criar bucket 'pet-avatars' com public access
- RLS do Storage: user pode upload/delete apenas no próprio path (userId/)
- Considerar placeholder image se tutor não tirar foto

## Related Stories
- Bloqueada por: IPET-003 (Auth)
- Usada por: IPET-010 (Booking — selecionar pets)
