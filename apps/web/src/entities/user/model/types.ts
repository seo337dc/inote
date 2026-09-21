export type UserProfile = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileInput = {
  nickname?: string;
};
