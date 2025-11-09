export interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  userId: string;
  name: string;
  avatar?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  identifier: string; // Can be email, phone number, or userId
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
}
