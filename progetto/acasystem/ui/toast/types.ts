export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  message: string;
  type?: ToastType;
}

export interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
  toasts: Toast[];
}
