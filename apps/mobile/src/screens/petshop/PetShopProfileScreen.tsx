import React from 'react';
import { View, ScrollView, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/RootNavigator';
import { usePetShopProfile } from '@/hooks/usePetShopProfile';
import { useReviews, useReviewCount } from '@/hooks/useReviews';
import { usePets } from '@/hooks/usePets';
import { ProfileHeader } from './components/ProfileHeader';
import { ServiceList } from './components/ServiceList';
import { ReviewSection } from './components/ReviewSection';
import { PhotoGallery } from './components/PhotoGallery';
import { BookButton } from './components/BookButton';

type Props = NativeStackScreenProps<MainStackParamList, 'PetShopProfile'>;

export const PetShopProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { petshopId, distance } = route.params;
  const { profile, isLoading, error } = usePetShopProfile(petshopId);
  const { reviews } = useReviews(petshopId, { limit: 3 });
  const { count: reviewCount } = useReviewCount(petshopId);
  const { pets } = usePets();

  const userPetSizes = Array.from(new Set(pets.map((pet) => pet.size)));

  const handleSeeAllReviews = () => {
    if (!profile) {
      return;
    }

    navigation.navigate('AllReviews', {
      petshopId,
      petshopName: profile.name,
    });
  };

  const handleBook = () => {
    if (!profile) {
      return;
    }

    navigation.navigate('BookingFlow', {
      petshopId: profile.id,
      petshopName: profile.name,
      petshopAddress: `${profile.address}, ${profile.city} - ${profile.state}`,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorTitle}>Erro ao carregar perfil</Text>
        <Text style={styles.errorMessage}>
          {error || 'Pet shop não encontrado'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          profile={profile}
          distance={distance}
          reviewCount={reviewCount}
        />
        <ServiceList services={profile.services} userPetSizes={userPetSizes} />
        <PhotoGallery photos={profile.petshop_photos} />
        <ReviewSection
          reviews={reviews}
          reviewCount={reviewCount}
          onSeeAll={handleSeeAllReviews}
        />
      </ScrollView>

      <BookButton onPress={handleBook} disabled={profile.services.length === 0} />
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
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
