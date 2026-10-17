export interface Category { id: string; name: string }
export interface AvailabilityWindow { id?: string; dayOfWeek: number; startMinute: number; endMinute: number }
export interface ResourceBlock { id: string; startAt: string; endAt: string; reason: string }
export interface ResourceInput {
  name: string; description: string; categoryId: string; location: string;
  capacity: number; facilities: string[]; requiresApproval: boolean; isActive: boolean;
}
export interface Resource extends ResourceInput { id: string; category: Category }
export interface ResourceDetail extends Resource { availability: AvailabilityWindow[]; blocks: ResourceBlock[] }
export interface ResourceList { resources: Resource[]; total: number; page: number; pageSize: number }
export interface ResourceFilters {
  q?: string; categoryId?: string; location?: string; minCapacity?: string;
  requiresApproval?: string; status?: string; page?: number;
}
