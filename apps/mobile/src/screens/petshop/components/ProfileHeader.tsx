import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import type { PetShopProfile } from '@/hooks/usePetShopProfile';

interface ProfileHeaderProps {
  profile: PetShopProfile;
  distance?: number;
  reviewCount: number;
}

function formatTime(time: string): string {
  return time.slice(0, 5);
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  distance,
  reviewCount,
}) => {
  const todayDayOfWeek = new Date().getDay();
  const todaySchedule = profile.schedules.find(
    (schedule) => schedule.day_of_week === todayDayOfWeek
  );
  const isOpenToday = Boolean(todaySchedule?.is_active);

  const openingHoursText = isOpenToday && todaySchedule
    ? `🕐 Hoje: ${formatTime(todaySchedule.start_time)} - ${formatTime(todaySchedule.end_time)}`
    : '🕐 Fechado hoje';

  return (
    <View>
      <View style={styles.coverContainer}>
        {profile.cover_photo ? (
          <Image source={{ uri: profile.cover_photo }} style={styles.coverPhoto} />
        ) : (
          <View style={[styles.coverPhoto, styles.coverPlaceholder]}>
            <Text style={styles.coverPlaceholderText}>🐾</Text>
          </View>
        )}

        <View style={styles.ratingBadge}>
          <Text style={styles.ratingBadgeText}>{profile.avg_rating.toFixed(1)} ★</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.address}>
          {profile.address}, {profile.city} - {profile.state}
        </Text>

        <View style={styles.metaRow}>
          {typeof distance === 'number' ? (
            <Text style={styles.metaItem}>📍 {distance.toFixed(1)} km</Text>
          ) : null}
          {profile.phone ? <Text style={styles.metaItem}>📞 {profile.phone}</Text> : null}
          <Text style={styles.metaItem}>⭐ {reviewCount} avaliações</Text>
        </View>

        {profile.description ? (
          <Text style={styles.description}>{profile.description}</Text>
        ) : null}

        <Text style={[styles.openingHours, isOpenToday ? styles.openToday : styles.closedToday]}>
          {openingHoursText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  coverContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#f0f0f0',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 64,
  },
  ratingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratingBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  infoContainer: {
    padding: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  metaItem: {
    fontSize: 13,
    color: '#666',
    marginRight: 16,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
  },
  openingHours: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  openToday: {
    color: '#2ecc71',
  },
  closedToday: {
    color: '#e74c3c',
  },
});
