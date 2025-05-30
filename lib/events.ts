// Simple event emitter for application-wide events
type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Record<string, EventCallback[]> = {};
  private isEmitting: Record<string, boolean> = {}; // Track emission state

  // Subscribe to an event
  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter((cb) => cb !== callback);
    };
  }

  // Emit an event with data
  emit(event: string, ...args: any[]): void {
    // Prevent recursive calls for the same event
    if (this.isEmitting[event]) {
      console.warn(`Prevented recursive emission of event: ${event}`);
      return;
    }

    if (!this.events[event]) {
      return;
    }

    try {
      // Mark that we're emitting this event
      this.isEmitting[event] = true;

      // Create a copy of the callbacks array to avoid issues if callbacks modify the array
      const callbacks = [...this.events[event]];

      // Execute each callback
      callbacks.forEach((callback) => {
        callback(...args);
      });
    } finally {
      // Always clear the emission flag when done
      this.isEmitting[event] = false;
    }
  }
}

// Create a singleton instance
export const eventBus = new EventEmitter();

// Define known event types
export const APP_EVENTS = {
  CURRENCY_CHANGED: "currency_changed",
};
