import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/RootNavigator';
import { useReviews, type ReviewSort } from '@/hooks/useReviews';
import { ReviewCard } from './components/ReviewCard';

type Props = NativeStackScreenProps<MainStackParamList, 'AllReviews'>;

const FILTER_OPTIONS: Array<{ label: string; value: ReviewSort }> = [
  { label: 'Recentes', value: 'recent' },
  { label: 'Melhores', value: 'best' },
  { label: 'Piores', value: 'worst' },
];

export const AllReviewsScreen: React.FC<Props> = ({ route }) => {
  const { petshopId } = route.params;
  const [sort, setSort] = useState<ReviewSort>('recent');
  const { reviews, isLoading } = useReviews(petshopId, { limit: 100, sort });

  if (isLoading && reviews.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {FILTER_OPTIONS.map((option, index) => {
          const isActive = sort === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setSort(option.value)}
              style={[
                styles.filterChip,
                isActive ? styles.filterChipActive : styles.filterChipInactive,
                index < FILTER_OPTIONS.length - 1 ? styles.filterChipSpacing : null,
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive
                    ? styles.filterChipTextActive
                    : styles.filterChipTextInactive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {reviews.length === 0 ? (
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.emptyText}>Nenhuma avaliação ainda</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.reviewItem}>
              <ReviewCard review={item} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipSpacing: {
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF6B6B',
  },
  filterChipInactive: {
    backgroundColor: '#f0f0f0',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipTextInactive: {
    color: '#666',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  reviewItem: {
    paddingTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
