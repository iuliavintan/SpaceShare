export const bookingStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED'] as const;
export type BookingStatus = typeof bookingStatuses[number];
export const bookingLabels: Record<BookingStatus, string> = { PENDING: 'În așteptare', APPROVED: 'Aprobată', REJECTED: 'Respinsă', CANCELLED: 'Anulată', COMPLETED: 'Încheiată' };
export type BookingAction = 'approve' | 'reject' | 'cancel';
export interface BookingInput { resourceId: string; startAt: string; endAt: string; reason?: string }
export interface Booking {
  id: string;
  userId: string;
  resourceId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  reason: string | null;
  decidedAt: string | null;
  decidedBy: { id: string; name: string } | null;
  resource: { id: string; name: string; location: string; isActive: boolean };
  user: { id: string; name: string; email: string };
}
export interface BookingList { bookings: Booking[]; total: number; page: number; pageSize: number }
export interface BookingFilters { scope: 'mine' | 'all'; status?: BookingStatus; page: number }
export interface AvailabilityResult { available: boolean; code: string; message: string }
