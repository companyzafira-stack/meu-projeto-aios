import type { PetSize } from './pet';

export type ServiceCategory = 'banho' | 'tosa' | 'hidratacao' | 'addon';

export interface Service {
  id: string;
  petshop_id: string;
  name: string;
  category: ServiceCategory;
  description: string | null;
  duration_minutes: number;
  is_addon: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServicePrice {
  id: string;
  service_id: string;
  size: PetSize;
  price: number;
  created_at: string;
}
