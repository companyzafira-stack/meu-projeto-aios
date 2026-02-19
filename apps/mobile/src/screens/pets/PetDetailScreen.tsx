import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { usePets, Pet } from '@/hooks/usePets';
import { deletePetPhoto } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';

type PetStackParamList = {
  PetDetail: { petId: string };
  MyPets: undefined;
  AddPet: { petId?: string; editingPet?: Pet };
};

type Props = NativeStackScreenProps<PetStackParamList, 'PetDetail'>;

export const PetDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { pets, deletePet } = usePets();
  const { petId } = route.params;

  const [pet, setPet] = useState<Pet | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const found = pets.find((p) => p.id === petId);
    setPet(found || null);
  }, [petId, pets]);

  if (!pet) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const handleEdit = () => {
    navigation.navigate('AddPet', { petId, editingPet: pet });
  };

  const handleDelete = () => {
    Alert.alert(
      'Deletar Pet',
      `Tem certeza que deseja remover ${pet.name}?`,
      [
        { text: 'Cancelar', onPress: () => {} },
        {
          text: 'Deletar',
          onPress: async () => {
            setDeleting(true);
            try {
              // Delete photo from storage if exists
              if (pet.photo_url && user) {
                await deletePetPhoto(user.id, pet.id);
              }

              // Delete pet from database
              await deletePet(pet.id);

              Alert.alert('Sucesso', 'Pet deletado com sucesso');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Falha ao deletar pet');
              console.error(error);
            } finally {
              setDeleting(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const sizeLabel = {
    P: 'Pequeno',
    M: 'Médio',
    G: 'Grande',
    GG: 'Muito Grande',
  }[pet.size];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Photo */}
        <View style={styles.photoSection}>
          {pet.photo_url ? (
            <Image source={{ uri: pet.photo_url }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>🐾</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.name}>{pet.name}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Espécie</Text>
              <Text style={styles.infoValue}>{pet.species}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Raça</Text>
              <Text style={styles.infoValue}>{pet.breed}</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Porte</Text>
              <Text style={styles.infoValue}>{sizeLabel}</Text>
            </View>

            {pet.age_months && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Idade</Text>
                <Text style={styles.infoValue}>{pet.age_months} meses</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={handleEdit}
            disabled={deleting}
          >
            <Text style={styles.editButtonText}>✏️ Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton, deleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#c00" />
            ) : (
              <Text style={styles.deleteButtonText}>🗑️ Deletar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photo: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 80,
  },
  infoSection: {
    marginBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#f0f0f0',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#fee',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c00',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
