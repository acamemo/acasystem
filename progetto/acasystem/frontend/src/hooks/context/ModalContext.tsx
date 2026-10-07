import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ModalActions, ModalState, ModalStore, UseModalsResult } from '@/@types/dashboard';
import { useModals } from '@/hooks/useModals';

const ModalContext = createContext<ModalStore | null>(null);

export function ModalProvider({ children }: { children?: ReactNode }) {
  const modalStore = useModals();
  return <ModalContext.Provider value={modalStore}>{children}</ModalContext.Provider>;
}

function useModalStore(): ModalStore {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalState must be used within a ModalProvider');
  }
  return context;
}

export function useModalSelector<T>(selector: (state: ModalState) => T): T {
  const modalStore = useModalStore();
  return useSyncExternalStore(
    modalStore.subscribe,
    () => selector(modalStore.getSnapshot()),
    () => selector(modalStore.getSnapshot())
  );
}

export function useModalActions(): ModalActions {
  return useModalStore().actions;
}

export function useModalState(): UseModalsResult {
  const modalStore = useModalStore();
  const state = useSyncExternalStore(
    modalStore.subscribe,
    modalStore.getSnapshot,
    modalStore.getSnapshot
  );
  return {
    ...state,
    ...modalStore.actions,
  };
}
