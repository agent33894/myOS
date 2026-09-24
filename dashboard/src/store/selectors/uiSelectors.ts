import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../ui';

export const useQuickCaptureActions = () =>
  useUIStore(
    useShallow((state) => ({
      openQuickCapture: state.openQuickCapture,
      closeQuickCapture: state.closeQuickCapture,
      toggleQuickCapture: state.toggleQuickCapture,
    })),
  );
