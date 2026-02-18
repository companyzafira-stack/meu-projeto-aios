export type PetShopStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type PetShopPlan = 'basic' | 'pro' | 'premium';

export interface PetShop {
  id: string;
  owner_id: string;
  name: string;
  cnpj: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  status: PetShopStatus;
  plan: PetShopPlan;
  avg_rating: number;
  min_price: number;
  max_price: number;
  created_at: string;
  updated_at: string;
}
