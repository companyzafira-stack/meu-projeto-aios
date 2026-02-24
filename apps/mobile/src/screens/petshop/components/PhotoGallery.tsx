import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import type { PetShopPhoto } from '@/hooks/usePetShopProfile';

interface PhotoGalleryProps {
  photos: PetShopPhoto[];
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos }) => {
  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fotos</Text>
      <FlatList
        data={photos}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Image source={{ uri: item.photo_url }} style={styles.photo} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  separator: {
    width: 10,
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
});
