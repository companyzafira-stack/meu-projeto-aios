import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBooking } from '../context/BookingContext';
import { useAvailableSlots, type AvailableSlot } from '../hooks/useAvailableSlots';

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function timeDiffMinutes(start: string, end: string): number {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  return (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hour, minute] = time.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + minutesToAdd;
  const nextHour = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');
  const nextMinute = (totalMinutes % 60).toString().padStart(2, '0');
  return `${nextHour}:${nextMinute}`;
}

function getValidStartSlots(
  slots: AvailableSlot[],
  totalDurationMinutes: number
): AvailableSlot[] {
  if (slots.length === 0) {
    return [];
  }

  const slotDuration = timeDiffMinutes(slots[0].slot_start, slots[0].slot_end);
  const slotsNeeded = Math.ceil(totalDurationMinutes / slotDuration);

  if (slotsNeeded <= 1) {
    return slots;
  }

  const validStarts: AvailableSlot[] = [];

  for (let index = 0; index <= slots.length - slotsNeeded; index += 1) {
    const group = slots.slice(index, index + slotsNeeded);
    const isConsecutive = group.every((slot, groupIndex) => {
      if (groupIndex === 0) {
        return true;
      }

      return slot.slot_start === group[groupIndex - 1]?.slot_end;
    });

    if (isConsecutive) {
      validStarts.push(group[0]);
    }
  }

  return validStarts;
}

function formatDateBrLong(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00`);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export const SelectTimeStep: React.FC = () => {
  const { state, dispatch, totalDuration } = useBooking();
  const { slots, isLoading, error } = useAvailableSlots(state.petshopId, state.selectedDate);

  const slotDuration = slots[0]
    ? timeDiffMinutes(slots[0].slot_start, slots[0].slot_end)
    : 0;

  const validSlots = useMemo(() => {
    if (totalDuration <= 0) {
      return [];
    }

    return getValidStartSlots(slots, totalDuration);
  }, [slots, totalDuration]);

  const isMultiSlotBooking = slotDuration > 0 && totalDuration > slotDuration;
  const canContinue = Boolean(state.selectedSlot);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Escolha o horário</Text>
        {state.selectedDate ? (
          <Text style={styles.subtitle}>📅 {formatDateBrLong(state.selectedDate)}</Text>
        ) : null}
      </View>

      {isMultiSlotBooking ? (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            ⏱ {state.selectedPets.length} pets = {totalDuration}min. Horários com tempo consecutivo disponível.
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !state.selectedDate ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Selecione uma data para ver os horários.</Text>
        </View>
      ) : validSlots.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            Nenhum horário disponível para esta data. Tente outra data.
          </Text>
        </View>
      ) : (
        <FlatList
          data={validSlots}
          keyExtractor={(item) => `${item.slot_start}-${item.slot_end}`}
          contentContainerStyle={styles.slotListContent}
          renderItem={({ item }) => {
            const startTime = formatTime(item.slot_start);
            const effectiveDuration = totalDuration > 0 ? totalDuration : slotDuration;
            const endTime = addMinutes(startTime, effectiveDuration);
            const isSelected =
              state.selectedSlot?.start === startTime && state.selectedSlot.end === endTime;

            return (
              <TouchableOpacity
                style={[
                  styles.slotCard,
                  isSelected ? styles.slotCardSelected : styles.slotCardAvailable,
                ]}
                onPress={() => {
                  dispatch({ type: 'SET_SLOT', start: startTime, end: endTime });
                }}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={styles.slotTime}>{startTime}</Text>
                  {isSelected ? (
                    <Text style={styles.slotEndTime}>até {endTime}</Text>
                  ) : null}
                </View>

                <Text style={styles.slotAvailability}>
                  {item.available_spots} vaga{item.available_spots > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
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
    color: '#666',
    marginTop: 4,
  },
  infoBanner: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  slotListContent: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  slotCardSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF0F0',
  },
  slotCardAvailable: {
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  slotTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  slotEndTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  slotAvailability: {
    fontSize: 13,
    color: '#2ecc71',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
