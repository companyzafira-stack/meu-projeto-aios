export type PetSize = 'P' | 'M' | 'G' | 'GG';
export type PetSpecies = 'dog' | 'cat' | 'other';

export interface Pet {
  id: string;
  tutor_id: string;
  name: string;
  species: PetSpecies;
  breed: string;
  size: PetSize;
  photo_url: string | null;
  date_of_birth: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
