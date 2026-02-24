import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';

export interface SelectedPet {
  id: string;
  name: string;
  size: string;
  photo_url: string | null;
}

export interface SelectedService {
  petId: string;
  serviceId: string;
  serviceName: string;
  category: string;
  price: number;
  duration_minutes: number;
}

export interface SelectedAddon {
  petId: string;
  serviceId: string;
  serviceName: string;
  price: number;
  duration_minutes: number;
}

export interface BookingState {
  step: number;
  petshopId: string;
  petshopName: string;
  petshopAddress: string;
  selectedPets: SelectedPet[];
  selectedServices: SelectedService[];
  selectedAddons: SelectedAddon[];
  selectedDate: string | null;
  selectedSlot: { start: string; end: string } | null;
  discount: { percent: number; minPets: number } | null;
}

type BookingAction =
  | { type: 'SET_PETSHOP'; petshopId: string; petshopName: string; petshopAddress: string }
  | { type: 'SET_PETS'; pets: SelectedPet[] }
  | { type: 'SET_SERVICE'; petId: string; service: Omit<SelectedService, 'petId'> }
  | { type: 'TOGGLE_ADDON'; petId: string; addon: Omit<SelectedAddon, 'petId'> }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_SLOT'; start: string; end: string }
  | { type: 'SET_DISCOUNT'; discount: { percent: number; minPets: number } | null }
  | { type: 'GO_TO_STEP'; step: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' };

const initialState: BookingState = {
  step: 1,
  petshopId: '',
  petshopName: '',
  petshopAddress: '',
  selectedPets: [],
  selectedServices: [],
  selectedAddons: [],
  selectedDate: null,
  selectedSlot: null,
  discount: null,
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_PETSHOP':
      return {
        ...state,
        petshopId: action.petshopId,
        petshopName: action.petshopName,
        petshopAddress: action.petshopAddress,
      };

    case 'SET_PETS': {
      const petIds = new Set(action.pets.map((pet) => pet.id));

      return {
        ...state,
        selectedPets: action.pets,
        selectedServices: state.selectedServices.filter((service) =>
          petIds.has(service.petId)
        ),
        selectedAddons: state.selectedAddons.filter((addon) => petIds.has(addon.petId)),
        selectedSlot: null,
      };
    }

    case 'SET_SERVICE': {
      const nextService: SelectedService = {
        petId: action.petId,
        ...action.service,
      };

      const existingIndex = state.selectedServices.findIndex(
        (service) => service.petId === action.petId
      );

      if (existingIndex >= 0) {
        const selectedServices = [...state.selectedServices];
        selectedServices[existingIndex] = nextService;

        return {
          ...state,
          selectedServices,
          selectedSlot: null,
        };
      }

      return {
        ...state,
        selectedServices: [...state.selectedServices, nextService],
        selectedSlot: null,
      };
    }

    case 'TOGGLE_ADDON': {
      const existingIndex = state.selectedAddons.findIndex(
        (addon) => addon.petId === action.petId && addon.serviceId === action.addon.serviceId
      );

      if (existingIndex >= 0) {
        return {
          ...state,
          selectedAddons: state.selectedAddons.filter((_, index) => index !== existingIndex),
          selectedSlot: null,
        };
      }

      const nextAddon: SelectedAddon = {
        petId: action.petId,
        ...action.addon,
      };

      return {
        ...state,
        selectedAddons: [...state.selectedAddons, nextAddon],
        selectedSlot: null,
      };
    }

    case 'SET_DATE':
      return {
        ...state,
        selectedDate: action.date,
        selectedSlot: null,
      };

    case 'SET_SLOT':
      return {
        ...state,
        selectedSlot: {
          start: action.start,
          end: action.end,
        },
      };

    case 'SET_DISCOUNT':
      return {
        ...state,
        discount: action.discount,
      };

    case 'GO_TO_STEP':
      return {
        ...state,
        step: Math.min(5, Math.max(1, action.step)),
      };

    case 'NEXT_STEP':
      return {
        ...state,
        step: Math.min(5, state.step + 1),
      };

    case 'PREV_STEP':
      return {
        ...state,
        step: Math.max(1, state.step - 1),
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  totalDuration: number;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  slotsNeeded: number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

interface BookingProviderProps {
  children: ReactNode;
}

export function BookingProvider({ children }: BookingProviderProps) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const computed = useMemo(() => {
    const servicesDuration = state.selectedServices.reduce(
      (sum, service) => sum + service.duration_minutes,
      0
    );
    const addonsDuration = state.selectedAddons.reduce(
      (sum, addon) => sum + addon.duration_minutes,
      0
    );
    const totalDuration = servicesDuration + addonsDuration;

    const servicesSubtotal = state.selectedServices.reduce(
      (sum, service) => sum + service.price,
      0
    );
    const addonsSubtotal = state.selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0
    );
    const subtotal = servicesSubtotal + addonsSubtotal;

    const hasApplicableDiscount =
      Boolean(state.discount) &&
      state.selectedPets.length >= (state.discount?.minPets ?? Number.MAX_SAFE_INTEGER);

    const discountAmount = hasApplicableDiscount && state.discount
      ? (subtotal * state.discount.percent) / 100
      : 0;

    const totalAmount = subtotal - discountAmount;
    const slotsNeeded = Math.max(1, Math.ceil((totalDuration || 0) / 60));

    return {
      totalDuration,
      subtotal,
      discountAmount,
      totalAmount,
      slotsNeeded,
    };
  }, [state.discount, state.selectedAddons, state.selectedPets.length, state.selectedServices]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      ...computed,
    }),
    [state, computed]
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);

  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }

  return context;
}
