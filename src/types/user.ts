import { Timestamp } from 'firebase/firestore';

export interface CustomTemplate {
  id: string;
  name: string;
  type: 'landscape' | 'portrait';
  zones: {
    id: number;
    type: 'video' | 'image' | 'text' | 'clock' | 'weather';
    x: number;
    y: number;
    w: number;
    h: number;
  }[];
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin' | 'co-admin';
  trialExpiry: Timestamp;
  subscriptionExpiry: Timestamp;
  createdAt: Timestamp;
  customTemplates?: CustomTemplate[];
}

export interface LicenseKey {
  key: string;
  durationMonths: 1 | 3 | 6 | 12;
  isUsed: boolean;
  usedBy?: string;
  createdAt: Timestamp;
}
