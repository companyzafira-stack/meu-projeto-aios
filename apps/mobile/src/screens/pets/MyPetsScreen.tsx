import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { usePets, type Pet } from '@/hooks/usePets';

type PetStackParamList = {
  MyPets: undefined;
  AddPet: { petId?: string; editingPet?: Pet };
  PetDetail: { petId: string };
};

type Props = NativeStackScreenProps<PetStackParamList, 'MyPets'>;

export const MyPetsScreen: React.FC<Props> = ({ navigation }) => {
  const { pets, loading } = usePets();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Meus Pets</Text>

          {pets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🐾</Text>
              <Text style={styles.emptyText}>Nenhum pet cadastrado</Text>
              <Text style={styles.emptySubtext}>Adicione seu primeiro pet para começar!</Text>
            </View>
          ) : (
            <View style={styles.petsList}>
              {pets.map((pet) => (
                <TouchableOpacity
                  key={pet.id}
                  style={styles.petCard}
                  onPress={() => navigation.navigate('PetDetail', { petId: pet.id })}
                >
                  {pet.photo_url ? (
                    <Image source={{ uri: pet.photo_url }} style={styles.petPhoto} />
                  ) : (
                    <View style={styles.petPhotoPlaceholder}>
                      <Text style={styles.petPhotoPlaceholderText}>🐾</Text>
                    </View>
                  )}

                  <View style={styles.petInfo}>
                    <Text style={styles.petName}>{pet.name}</Text>
                    <Text style={styles.petDetail}>{pet.breed}</Text>
                    <View style={styles.petMeta}>
                      <Text style={styles.petSize}>{pet.size === 'P' ? 'Pequeno' : pet.size === 'M' ? 'Médio' : pet.size === 'G' ? 'Grande' : 'Muito Grande'}</Text>
                      {pet.age_months && (
                        <Text style={styles.petAge}>{pet.age_months} meses</Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Pet Button (FAB) */}
      {pets.length < 5 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddPet', {})}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  petsList: {
    gap: 12,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  petPhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  petPhotoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  petPhotoPlaceholderText: {
    fontSize: 32,
  },
  petInfo: {
    flex: 1,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  petDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  petMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  petSize: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  petAge: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chevron: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
});
