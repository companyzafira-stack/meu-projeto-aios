import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';

export async function uploadPetPhoto(userId: string, petId: string, uri: string): Promise<string> {
  try {
    // Read the file
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Supabase Storage
    const fileName = `${userId}/${petId}.jpg`;
    const { error } = await supabase.storage
      .from('pet-avatars')
      .upload(fileName, decode(base64), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('pet-avatars')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading pet photo:', error);
    throw new Error('Falha ao fazer upload da foto');
  }
}

export async function deletePetPhoto(userId: string, petId: string): Promise<void> {
  try {
    const fileName = `${userId}/${petId}.jpg`;
    const { error } = await supabase.storage
      .from('pet-avatars')
      .remove([fileName]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting pet photo:', error);
    throw new Error('Falha ao deletar foto');
  }
}

function decode(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length / 2);
  for (let i = 0; i < str.length; i += 2) {
    bytes[i / 2] = parseInt(str.substr(i, 2), 16);
  }
  return bytes;
}
