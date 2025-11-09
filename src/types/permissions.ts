export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface PermissionState {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  storage: PermissionStatus;
}

export interface PermissionError {
  type: 'camera' | 'microphone' | 'storage';
  message: string;
}
