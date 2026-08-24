import { useEffect } from 'react';

type FileEventType = 'created' | 'updated' | 'deleted';
type FileEventCallback = (event: FileEventType, data: { filePath: string }) => void;

// Global event subscribers
const subscribers = new Set<FileEventCallback>();
let isListening = false;

// Setup the global listener once
function setupGlobalListener() {
  if (!window.electronAPI) return;
  if (isListening) return;

  // Remove any old listeners first (important for hot reload)
  if (window.electronAPI.removeFileChangedListener) {
    window.electronAPI.removeFileChangedListener();
  }

  // Set up new listener that broadcasts to current subscribers
  window.electronAPI.onFileChanged((event: string, data: { filePath: string }) => {
    // Broadcast to all subscribers
    subscribers.forEach(callback => {
      try {
        callback(event as FileEventType, data);
      } catch (error) {
        console.error('[useFileWatcherEvents] Subscriber error:', error);
      }
    });
  });

  isListening = true;
}

/**
 * Hook to subscribe to file watcher events.
 * Multiple components can use this hook without interfering with each other.
 */
export function useFileWatcherEvents(callback: FileEventCallback) {
  useEffect(() => {
    if (!window.electronAPI) return;

    // Setup global listener on first subscriber
    setupGlobalListener();

    // Add this subscriber
    subscribers.add(callback);

    return () => {
      // Remove this subscriber
      subscribers.delete(callback);
    };
  }, [callback]);
}
