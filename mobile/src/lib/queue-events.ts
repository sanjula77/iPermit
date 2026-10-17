// Tells screens that the offline queue changed, so a count or list can reload.
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitQueueChange(): void {
  listeners.forEach((listener) => listener());
}
