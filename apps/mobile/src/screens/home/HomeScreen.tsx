import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Text,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useLocation } from '@/hooks/useLocation';
import { usePetShops } from '@/hooks/usePetShops';
import { SearchBar } from './components/SearchBar';
import { PetShopCard } from './components/PetShopCard';
import { PetShopCardSkeleton } from './components/PetShopCardSkeleton';
import { EmptyState } from './components/EmptyState';
import { MainStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MainStackParamList, 'Home'>;

type SortBy = 'distance' | 'rating' | 'price';

export const HomeScreen: React.FC<Props> = () => {
  const { location, loading: locationLoading, error: locationError } = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('distance');
  const [refreshing, setRefreshing] = useState(false);

  const { petshops, isLoading, error: petshopsError, refetch } = usePetShops(
    location?.latitude || 0,
    location?.longitude || 0,
    searchTerm,
    sortBy
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handlePetShopPress = () => {
    // TODO: Navigate to pet shop detail (IPET-009)
    // navigation.navigate('PetShopDetail', { petshopId });
  };

  // Loading state - waiting for location
  if (locationLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Obtendo sua localização...</Text>
      </View>
    );
  }

  // Error state - location permission denied
  if (locationError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorIcon}>📍</Text>
        <Text style={styles.errorTitle}>Permissão de Localização</Text>
        <Text style={styles.errorMessage}>
          Para encontrar pet shops próximos, permita o acesso à sua localização.
        </Text>
      </View>
    );
  }

  // Loading skeleton while fetching pet shops
  if (isLoading && petshops.length === 0) {
    return (
      <View style={styles.container}>
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((i) => (
            <PetShopCardSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  // Error state - fetching pet shops failed
  if (petshopsError) {
    return (
      <View style={styles.container}>
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Erro ao Carregar</Text>
          <Text style={styles.errorMessage}>{petshopsError}</Text>
        </View>
      </View>
    );
  }

  // Empty state - no pet shops found
  if (petshops.length === 0) {
    return (
      <View style={styles.container}>
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
        <EmptyState
          title="Nenhum pet shop encontrado"
          message={
            searchTerm
              ? `Nenhum resultado para "${searchTerm}"`
              : 'Nenhum pet shop encontrado na sua região'
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        }
        data={petshops}
        renderItem={({ item }) => (
          <PetShopCard
            petshop={item}
            onPress={handlePetShopPress}
          />
        )}
        keyExtractor={(item) => item.id}
        scrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#FF6B6B"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  skeletonContainer: {
    paddingVertical: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
});
