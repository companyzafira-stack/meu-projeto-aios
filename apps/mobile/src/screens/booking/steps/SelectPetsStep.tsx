import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePets } from '@/hooks/usePets';
import { useBooking, type SelectedPet } from '../context/BookingContext';

function mapPetToSelected(pet: {
  id: string;
  name: string;
  size: string;
  photo_url: string | null;
}): SelectedPet {
  return {
    id: pet.id,
    name: pet.name,
    size: pet.size,
    photo_url: pet.photo_url,
  };
}

export const SelectPetsStep: React.FC = () => {
  const { pets, loading, error } = usePets();
  const { state, dispatch } = useBooking();

  const selectedPetIds = useMemo(
    () => new Set(state.selectedPets.map((pet) => pet.id)),
    [state.selectedPets]
  );

  const togglePet = (pet: {
    id: string;
    name: string;
    species: string;
    size: string;
    photo_url: string | null;
  }) => {
    const isSelected = selectedPetIds.has(pet.id);

    if (isSelected) {
      dispatch({
        type: 'SET_PETS',
        pets: state.selectedPets.filter((selectedPet) => selectedPet.id !== pet.id),
      });
      return;
    }

    dispatch({
      type: 'SET_PETS',
      pets: [...state.selectedPets, mapPetToSelected(pet)],
    });
  };

  const canContinue = state.selectedPets.length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Selecione seus pets</Text>
        <Text style={styles.subtitle}>Escolha quais pets serão atendidos</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : pets.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Você ainda não tem pets cadastrados.</Text>
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedPetIds.has(item.id);

            return (
              <TouchableOpacity
                style={[
                  styles.petCard,
                  isSelected ? styles.petCardSelected : styles.petCardUnselected,
                ]}
                onPress={() => togglePet(item)}
                activeOpacity={0.85}
              >
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={styles.petPhoto} />
                ) : (
                  <View style={[styles.petPhoto, styles.petPhotoPlaceholder]}>
                    <Text style={styles.petPhotoPlaceholderText}>🐾</Text>
                  </View>
                )}

                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{item.name}</Text>
                  <Text style={styles.petMeta}>
                    {item.species} • Porte {item.size}
                  </Text>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    isSelected ? styles.checkboxSelected : styles.checkboxUnselected,
                  ]}
                >
                  {isSelected ? <Text style={styles.checkboxCheck}>✓</Text> : null}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          disabled={!canContinue}
          onPress={() => dispatch({ type: 'NEXT_STEP' })}
          activeOpacity={0.9}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 12,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  petCardSelected: {
    backgroundColor: '#FFF0F0',
    borderColor: '#FF6B6B',
  },
  petCardUnselected: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  petPhoto: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
  },
  petPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  petPhotoPlaceholderText: {
    fontSize: 22,
  },
  petInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  petMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkboxSelected: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  checkboxUnselected: {
    backgroundColor: '#fff',
    borderColor: '#ddd',
  },
  checkboxCheck: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  continueButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: '#ccc',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
