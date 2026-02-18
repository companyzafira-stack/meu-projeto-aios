---
story_id: IPET-024
status: Pending
epic: App Tutor
priority: Medium
feature_section: F1.2-F1.3 (Mapa e Filtros Avançados)
acceptance_criteria:
  - Mapa com pins de pet shops próximos
  - Filtros por serviço, preço, nota, distância
  - Alternância entre lista e mapa
scope: Frontend
dependencies:
  - IPET-006
constraints:
  - "Google Maps API ou Mapbox (free tier)"
  - "Geolocalização do tutor via expo-location"
estimates_days: 2
---

# Map View & Advanced Filters — IPET-024

## Summary
Visualização em mapa dos pet shops próximos com pins interativos + sistema de filtros avançados para refinar busca por serviço, preço, nota e distância.

## User Story
As a tutor,
I want to see pet shops on a map and filter by my preferences,
So that I can quickly find the best option near me.

## Acceptance Criteria
- [ ] **Toggle lista/mapa:** botão na home alterna entre ListView e MapView
- [ ] **MapView:** mapa centralizado na localização do tutor com pins dos pet shops
- [ ] Cada pin mostra: nome, nota média, menor preço de banho
- [ ] Toque no pin abre card resumo (foto, nome, nota, distância, serviços)
- [ ] Toque no card abre perfil completo (IPET-009)
- [ ] **Filtros avançados** (modal/bottom sheet):
  - Serviço: Banho, Tosa, Banho+Tosa, Hidratação (checkboxes)
  - Preço máximo: slider R$ 20 — R$ 200
  - Nota mínima: 3+, 4+, 4.5+ (radio)
  - Distância máxima: 2km, 5km, 10km, 20km (radio)
  - Ordenação: Mais próximo, Melhor avaliado, Menor preço
- [ ] Filtros aplicados atualizam tanto ListView quanto MapView
- [ ] **Badge** no botão de filtro mostrando quantos filtros ativos
- [ ] Botão "Limpar filtros" reseta todos
- [ ] **Permissão de localização:** solicitar via expo-location, fallback para cidade manual
- [ ] Mapa atualiza ao mover (lazy load de pet shops na área visível)

## Technical Details

### Map Component (react-native-maps)
```bash
npx expo install react-native-maps expo-location
```

```typescript
// apps/mobile/src/screens/home/MapView.tsx
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';

export function PetShopMapView({ petshops, onPetShopPress }) {
  const [region, setRegion] = useState({
    latitude: -18.7264,  // Curvelo default
    longitude: -44.4314,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setRegion(prev => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      }
    })();
  }, []);

  return (
    <MapView region={region} onRegionChangeComplete={setRegion}>
      {petshops.map(shop => (
        <Marker
          key={shop.id}
          coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
          title={shop.name}
          description={`⭐ ${shop.avg_rating} · R$ ${shop.min_price}`}
        >
          <Callout onPress={() => onPetShopPress(shop.id)}>
            <PetShopCalloutCard petshop={shop} />
          </Callout>
        </Marker>
      ))}
    </MapView>
  );
}
```

### Filter Logic
```typescript
// apps/mobile/src/hooks/useFilteredPetShops.ts
interface Filters {
  services: string[];       // ['banho', 'tosa']
  maxPrice: number;         // 0-200
  minRating: number;        // 0, 3, 4, 4.5
  maxDistance: number;       // km
  sortBy: 'distance' | 'rating' | 'price';
}

function applyFilters(petshops: PetShop[], filters: Filters, userLocation: Location): PetShop[] {
  let filtered = petshops;

  // Filter by service
  if (filters.services.length > 0) {
    filtered = filtered.filter(shop =>
      filters.services.some(s => shop.services.includes(s))
    );
  }

  // Filter by max price
  if (filters.maxPrice > 0) {
    filtered = filtered.filter(shop => shop.min_price <= filters.maxPrice);
  }

  // Filter by min rating
  if (filters.minRating > 0) {
    filtered = filtered.filter(shop => shop.avg_rating >= filters.minRating);
  }

  // Filter by max distance
  if (filters.maxDistance > 0) {
    filtered = filtered.filter(shop => shop.distance_km <= filters.maxDistance);
  }

  // Sort
  const sortFns = {
    distance: (a, b) => a.distance_km - b.distance_km,
    rating: (a, b) => b.avg_rating - a.avg_rating,
    price: (a, b) => a.min_price - b.min_price,
  };
  filtered.sort(sortFns[filters.sortBy]);

  return filtered;
}
```

### Supabase Query with Filters
```typescript
// Server-side filtered query
async function getFilteredPetShops(lat: number, lng: number, filters: Filters) {
  let query = supabase.rpc('get_nearby_petshops', {
    user_lat: lat,
    user_lng: lng,
    radius_km: filters.maxDistance || 20,
  });

  if (filters.minRating > 0) {
    query = query.gte('avg_rating', filters.minRating);
  }

  const { data } = await query;
  return data;
}
```

### UI Structure
```
apps/mobile/src/screens/home/
├── HomeScreen.tsx          — Container com toggle lista/mapa
├── ListView.tsx            — Lista existente (IPET-006)
├── MapView.tsx             — Mapa com pins
├── FilterModal.tsx         — Bottom sheet com filtros
├── PetShopCalloutCard.tsx  — Card no pin do mapa
└── hooks/
    ├── useUserLocation.ts  — Geolocalização
    └── useFilteredPetShops.ts — Lógica de filtros
```

## Testing
- [ ] Mapa renderiza com pins corretos
- [ ] Geolocalização centraliza mapa na posição do tutor
- [ ] Toque no pin abre callout card
- [ ] Toque no card navega para perfil do pet shop
- [ ] Toggle lista/mapa funciona
- [ ] Filtro por serviço funciona
- [ ] Filtro por preço máximo funciona
- [ ] Filtro por nota mínima funciona
- [ ] Filtro por distância funciona
- [ ] Ordenação (distância, nota, preço) funciona
- [ ] Badge de filtros ativos atualiza
- [ ] "Limpar filtros" reseta tudo
- [ ] Sem permissão de localização: fallback para cidade manual

## File List
*Auto-maintained*

## Notes
- Google Maps API: free tier 28k loads/mês (suficiente para MVP)
- Alternativa: Mapbox (50k loads/mês free)
- Usar `expo-location` para geolocalização (permissions handling nativo)
- Lazy loading: buscar pet shops quando região do mapa muda (debounce 500ms)
- Curvelo center: lat -18.7264, lng -44.4314

## Related Stories
- Bloqueada por: IPET-006 (Home/Discovery)
- Complementa: IPET-009 (Pet Shop Profile)
