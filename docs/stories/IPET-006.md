---
story_id: IPET-006
status: Pending
epic: App Tutor
priority: High
feature_section: F2 (Descoberta de Pet Shops)
acceptance_criteria:
  - Home mostra lista de pet shops próximos
  - Card com foto, nome, nota, distância, preço "a partir de"
  - Busca por nome funciona
  - Ordenação por distância, avaliação, preço
scope: Frontend
dependencies:
  - IPET-002
constraints:
  - "Geolocalização via expo-location"
  - "Google Maps ou cálculo de distância no Supabase"
estimates_days: 1
---

# Home Screen — Pet Shop Discovery — IPET-006

## Summary
Tela principal do app onde tutor vê pet shops próximos. Cards estilo iFood com informações essenciais. Busca e ordenação básica.

## User Story
As a tutor,
I want to see nearby pet shops with prices and ratings,
So that I can choose the best one for my pet.

## Acceptance Criteria
- [ ] Home mostra lista de pet shops com status 'active' ordenados por distância
- [ ] Card: foto de capa, nome, nota média (ex: 4.7 ★), nº avaliações, distância (ex: 1.2 km), "a partir de R$ 35"
- [ ] Campo de busca no topo: filtra por nome do pet shop
- [ ] Ordenação: Mais próximo (default), Melhor avaliado, Menor preço
- [ ] Pull-to-refresh atualiza lista
- [ ] Loading skeleton enquanto carrega
- [ ] Estado vazio: "Nenhum pet shop encontrado na sua região"
- [ ] Tocar no card navega para perfil do pet shop (IPET-009)

## Technical Details

### Geolocalização
```bash
npx expo install expo-location
```

```typescript
// apps/mobile/src/hooks/useLocation.ts
import * as Location from 'expo-location';

export function useLocation() {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  return location;
}
```

### Query Pet Shops (com distância)
```typescript
// Supabase RPC function for distance calculation
// Create in Supabase SQL Editor:
CREATE OR REPLACE FUNCTION get_nearby_petshops(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  cover_photo TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  avg_rating NUMERIC,
  review_count BIGINT,
  min_price NUMERIC
) AS $$
  SELECT
    p.id, p.name, p.address, p.cover_photo, p.lat, p.lng,
    (6371 * acos(
      cos(radians(user_lat)) * cos(radians(p.lat)) *
      cos(radians(p.lng) - radians(user_lng)) +
      sin(radians(user_lat)) * sin(radians(p.lat))
    )) AS distance_km,
    COALESCE(AVG(r.rating), 0) AS avg_rating,
    COUNT(r.id) AS review_count,
    MIN(sp.price) AS min_price
  FROM petshops p
  LEFT JOIN reviews r ON r.petshop_id = p.id AND r.is_hidden = FALSE
  LEFT JOIN services s ON s.petshop_id = p.id AND s.is_active = TRUE
  LEFT JOIN service_prices sp ON sp.service_id = s.id
  WHERE p.status = 'active'
  GROUP BY p.id
  HAVING (6371 * acos(
    cos(radians(user_lat)) * cos(radians(p.lat)) *
    cos(radians(p.lng) - radians(user_lng)) +
    sin(radians(user_lat)) * sin(radians(p.lat))
  )) < radius_km
  ORDER BY distance_km;
$$ LANGUAGE sql;
```

### Components
```
src/screens/home/
├── HomeScreen.tsx          — Container principal
├── SearchBar.tsx           — Campo de busca + filtros
├── PetShopCard.tsx         — Card individual (foto, nome, nota, distância, preço)
├── PetShopCardSkeleton.tsx — Loading placeholder
└── EmptyState.tsx          — "Nenhum pet shop encontrado"
```

### Data Fetching
```typescript
// apps/mobile/src/hooks/usePetShops.ts
export function usePetShops(lat: number, lng: number, sortBy: string) {
  return useQuery({
    queryKey: ['petshops', lat, lng, sortBy],
    queryFn: () => supabase.rpc('get_nearby_petshops', {
      user_lat: lat,
      user_lng: lng,
    }),
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
}
```

## Testing
- [ ] Lista carrega pet shops com dados corretos
- [ ] Distância é calculada corretamente
- [ ] Busca por nome filtra corretamente
- [ ] Ordenação funciona (distância, nota, preço)
- [ ] Pull-to-refresh atualiza dados
- [ ] Skeleton aparece durante loading
- [ ] Estado vazio aparece quando não há resultados
- [ ] Tocar no card navega corretamente

## File List
*Auto-maintained*

## Notes
- Usar TanStack Query (React Query) para cache + fetching
- Haversine formula no PostgreSQL para cálculo de distância
- Considerar pagination (20 pet shops por vez) se lista for grande
- Foto de capa: usar placeholder se pet shop não tiver foto

## Related Stories
- Bloqueada por: IPET-002 (Schema)
- Bloqueador para: IPET-009 (Pet Shop Profile), IPET-024 (Map View)
