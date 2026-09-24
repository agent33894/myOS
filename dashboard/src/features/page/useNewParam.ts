import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * True when the item was just created (`?new=1` from New note, New project,
 * and friends). The param is stripped at once so reloads and Back don't
 * re-trigger; the answer holds until `key` changes.
 */
export function useNewParam(key: string): boolean {
  const [params, setParams] = useSearchParams();
  const [newKey, setNewKey] = useState<string | null>(() => (params.get('new') === '1' ? key : null));

  useEffect(() => {
    if (params.get('new') !== '1') return;
    setNewKey(key);
    const next = new URLSearchParams(params);
    next.delete('new');
    setParams(next, { replace: true });
  }, [params, setParams, key]);

  return newKey === key;
}
