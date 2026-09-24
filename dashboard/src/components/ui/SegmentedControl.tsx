import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { SegmentedControl as UISegmentedControl } from '../../ui';

/** @deprecated Adapter for unrebuilt screens. Use `SegmentedControl` from `src/ui`. */
export function SegmentedControl<T extends string>({
  onChange,
  size = 'sm',
  ...props
}: {
  options: { value: T; label: ReactNode; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  'aria-label': string;
  className?: string;
}) {
  return <UISegmentedControl {...props} size={size} onValueChange={onChange} />;
}
