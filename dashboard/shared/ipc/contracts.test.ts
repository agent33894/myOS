import { describe, expect, test } from 'vitest';
import { IPC_INVOKE_CHANNELS } from './contracts';

describe('IPC contracts', () => {
  test('contains critical channels', () => {
    expect(IPC_INVOKE_CHANNELS).toContain('artifacts:create');
    expect(IPC_INVOKE_CHANNELS).toContain('git:artifact-rules:set');
    expect(IPC_INVOKE_CHANNELS).toContain('vault:choose-folder');
    expect(IPC_INVOKE_CHANNELS).toContain('vault:create-default');
  });

  test('has no duplicate invoke channels', () => {
    const unique = new Set(IPC_INVOKE_CHANNELS);
    expect(unique.size).toBe(IPC_INVOKE_CHANNELS.length);
  });
});
