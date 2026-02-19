import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';

import { usePets, Pet } from '@/hooks/usePets';
import { compressImage } from '@/utils/imageCompression';
import { uploadPetPhoto } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';

type PetStackParamList = {
  AddPet: { petId?: string; editingPet?: Pet };
  MyPets: undefined;
};

type Props = NativeStackScreenProps<PetStackParamList, 'AddPet'>;

interface FormData {
  name: string;
  species: 'Cão' | 'Gato';
  breed: string;
  size: 'P' | 'M' | 'G' | 'GG';
  age_months: string;
  photo_uri: string | null;
}

export const AddPetScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { createPet, updatePet, pets } = usePets();

  const editingPet = route.params?.editingPet;
  const isEditing = !!editingPet;

  const [form, setForm] = useState<FormData>({
    name: editingPet?.name || '',
    species: editingPet?.species || 'Cão',
    breed: editingPet?.breed || '',
    size: editingPet?.size || 'M',
    age_months: editingPet?.age_months?.toString() || '',
    photo_uri: editingPet?.photo_url || null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setForm({ ...form, photo_uri: result.assets[0].uri });
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Acesse configurações para permitir câmera');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setForm({ ...form, photo_uri: result.assets[0].uri });
    }
  };

  const handleSubmit = async () => {
    setError('');

    // Validations
    if (!form.name.trim()) {
      setError('Nome do pet é obrigatório');
      return;
    }

    if (!form.breed.trim()) {
      setError('Raça é obrigatória');
      return;
    }

    // Check pet limit
    if (!isEditing && pets.length >= 5) {
      setError('Você já tem o máximo de 5 pets');
      return;
    }

    setLoading(true);

    try {
      const petId = editingPet?.id || `pet_${Date.now()}`;

      let photoUrl = editingPet?.photo_url || null;

      // Upload photo if new
      if (form.photo_uri && form.photo_uri !== editingPet?.photo_url && user) {
        const compressedUri = await compressImage(form.photo_uri);
        photoUrl = await uploadPetPhoto(user.id, petId, compressedUri);
      }

      const petData = {
        name: form.name.trim(),
        species: form.species,
        breed: form.breed.trim(),
        size: form.size,
        age_months: form.age_months ? parseInt(form.age_months) : null,
        photo_url: photoUrl,
      };

      if (isEditing) {
        await updatePet(editingPet.id, petData);
      } else {
        await createPet(petData);
      }

      Alert.alert('Sucesso', isEditing ? 'Pet atualizado!' : 'Pet cadastrado!');
      navigation.goBack();
    } catch (err) {
      setError('Erro ao salvar pet. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{isEditing ? 'Editar Pet' : 'Cadastrar Pet'}</Text>

        {error && <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>}

        {/* Photo */}
        <View style={styles.photoSection}>
          {form.photo_uri ? (
            <Image source={{ uri: form.photo_uri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>📷</Text>
            </View>
          )}

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={takePhoto}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={pickImage}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Nome do Pet *</Text>
          <View style={styles.input}>
            <Text style={styles.inputText}>{form.name}</Text>
          </View>
        </View>

        {/* Species */}
        <View style={styles.field}>
          <Text style={styles.label}>Espécie *</Text>
          <View style={styles.pickerContainer}>
            {(['Cão', 'Gato'] as const).map((species) => (
              <TouchableOpacity
                key={species}
                style={[styles.pickerOption, form.species === species && styles.pickerOptionActive]}
                onPress={() => setForm({ ...form, species })}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    form.species === species && styles.pickerOptionTextActive,
                  ]}
                >
                  {species}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Breed */}
        <View style={styles.field}>
          <Text style={styles.label}>Raça *</Text>
          <View style={styles.input}>
            <Text style={styles.inputText}>{form.breed}</Text>
          </View>
        </View>

        {/* Size */}
        <View style={styles.field}>
          <Text style={styles.label}>Porte *</Text>
          <View style={styles.pickerContainer}>
            {(['P', 'M', 'G', 'GG'] as const).map((size) => (
              <TouchableOpacity
                key={size}
                style={[styles.pickerOption, form.size === size && styles.pickerOptionActive]}
                onPress={() => setForm({ ...form, size })}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    form.size === size && styles.pickerOptionTextActive,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Age */}
        <View style={styles.field}>
          <Text style={styles.label}>Idade (meses)</Text>
          <View style={styles.input}>
            <Text style={styles.inputText}>{form.age_months || '-'}</Text>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isEditing ? 'Atualizar Pet' : 'Cadastrar Pet'}
            </Text>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#fee',
    borderColor: '#f88',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  photoSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  photoPreview: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  photoPlaceholderText: {
    fontSize: 48,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  pickerOptionTextActive: {
    color: '#fff',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
