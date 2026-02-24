import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/navigation/RootNavigator';
import { BookingProvider, useBooking } from './context/BookingContext';
import { useMultiPetDiscount } from './hooks/useMultiPetDiscount';
import { SelectPetsStep } from './steps/SelectPetsStep';
import { SelectServicesStep } from './steps/SelectServicesStep';
import { SelectDateStep } from './steps/SelectDateStep';
import { SelectTimeStep } from './steps/SelectTimeStep';
import { ReviewStep } from './steps/ReviewStep';

type Props = NativeStackScreenProps<MainStackParamList, 'BookingFlow'>;

const STEP_LABELS = ['Pets', 'Serviços', 'Data', 'Horário', 'Resumo'] as const;

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <View style={styles.progressBar}>
      {STEP_LABELS.map((_, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;

        return (
          <React.Fragment key={`step-${stepNumber}`}>
            <View
              style={[
                styles.progressDot,
                isActive
                  ? styles.progressDotActive
                  : isCompleted
                    ? styles.progressDotCompleted
                    : styles.progressDotInactive,
              ]}
            />
            {index < STEP_LABELS.length - 1 ? (
              <View
                style={[
                  styles.progressLine,
                  currentStep > stepNumber
                    ? styles.progressLineCompleted
                    : styles.progressLineInactive,
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function BookingFlowContent({ route, navigation }: Props) {
  const { state, dispatch } = useBooking();
  const { petshopId, petshopName, petshopAddress } = route.params;
  const { discounts } = useMultiPetDiscount(petshopId);

  useEffect(() => {
    dispatch({
      type: 'SET_PETSHOP',
      petshopId,
      petshopName,
      petshopAddress,
    });
  }, [dispatch, petshopAddress, petshopId, petshopName]);

  useEffect(() => {
    const applicableDiscounts = discounts.filter(
      (discount) => discount.min_pets <= state.selectedPets.length
    );
    const bestDiscount = applicableDiscounts[applicableDiscounts.length - 1];

    dispatch({
      type: 'SET_DISCOUNT',
      discount: bestDiscount
        ? {
            percent: bestDiscount.discount_percent,
            minPets: bestDiscount.min_pets,
          }
        : null,
    });
  }, [dispatch, discounts, state.selectedPets.length]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (state.step <= 1) {
        return;
      }

      event.preventDefault();
      dispatch({ type: 'PREV_STEP' });
    });

    return unsubscribe;
  }, [dispatch, navigation, state.step]);

  const currentStepLabel = STEP_LABELS[state.step - 1] ?? STEP_LABELS[0];

  let stepContent: React.ReactNode = null;

  switch (state.step) {
    case 1:
      stepContent = <SelectPetsStep />;
      break;
    case 2:
      stepContent = <SelectServicesStep />;
      break;
    case 3:
      stepContent = <SelectDateStep />;
      break;
    case 4:
      stepContent = <SelectTimeStep />;
      break;
    case 5:
      stepContent = <ReviewStep />;
      break;
    default:
      stepContent = <SelectPetsStep />;
      break;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.stepLabelText}>{currentStepLabel}</Text>
        <ProgressBar currentStep={state.step} />
      </View>

      <View style={styles.stepContainer}>{stepContent}</View>
    </View>
  );
}

export const BookingFlowScreen: React.FC<Props> = (props) => {
  return (
    <BookingProvider>
      <BookingFlowContent {...props} />
    </BookingProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 12,
  },
  stepLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 4,
  },
  progressDot: {
    borderRadius: 6,
  },
  progressDotActive: {
    width: 12,
    height: 12,
    backgroundColor: '#FF6B6B',
  },
  progressDotCompleted: {
    width: 10,
    height: 10,
    backgroundColor: '#FF6B6B',
  },
  progressDotInactive: {
    width: 10,
    height: 10,
    backgroundColor: '#ddd',
  },
  progressLine: {
    height: 2,
    flex: 1,
    marginHorizontal: 6,
  },
  progressLineCompleted: {
    backgroundColor: '#FF6B6B',
  },
  progressLineInactive: {
    backgroundColor: '#ddd',
  },
  stepContainer: {
    flex: 1,
  },
});
