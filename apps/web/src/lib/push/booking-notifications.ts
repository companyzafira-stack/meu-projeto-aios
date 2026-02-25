// Deprecated: use booking-events.ts instead.
import { onBookingCancelled } from './booking-events';

export { onBookingConfirmed as sendBookingConfirmedNotifications } from './booking-events';

export async function sendBookingExpiredNotification(
  bookingId: string
): Promise<void> {
  await onBookingCancelled(bookingId, 'system');
}
