/**
 * EatFair Shared Types
 * Single source of truth for all TypeScript interfaces
 */

// =============================================================================
// USER TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  fcmToken?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// ORDER TYPES
// =============================================================================

export type OrderStatus =
  | 'Pending'
  | 'Placed'
  | 'Accepted'
  | 'Preparing'
  | 'Ready'
  | 'DriverAssigned'
  | 'PickedUp'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  customizations?: string[];
  specialInstructions?: string;
}

export interface Order {
  id: string;
  shortId: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  restaurantId: string;
  restaurantName: string;
  driverId?: string;
  driverName?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tip: number;
  tax: number;
  total: number;
  platformFee: number;
  deliveryAddress: Address;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  stripeChargeId?: string;
  estimatedDeliveryTime?: string;
  driverLocation?: DriverLocation;
  createdAt: Date;
  acceptedAt?: Date;
  readyAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
}

// =============================================================================
// RESTAURANT TYPES
// =============================================================================

export interface Restaurant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address: Address;
  latitude: number;
  longitude: number;
  cuisineTypes: string[];
  rating: number;
  ratingCount: number;
  priceLevel: 1 | 2 | 3 | 4;
  imageURL?: string;
  isOpen: boolean;
  openingHours: OpeningHours;
  preparationTime: number; // minutes
  deliveryRadius: number; // km
  minimumOrder: number;
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted';
  status: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface OpeningHours {
  monday: TimeRange;
  tuesday: TimeRange;
  wednesday: TimeRange;
  thursday: TimeRange;
  friday: TimeRange;
  saturday: TimeRange;
  sunday: TimeRange;
}

export interface TimeRange {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageURL?: string;
  isAvailable: boolean;
  customizations?: MenuCustomization[];
}

export interface MenuCustomization {
  id: string;
  name: string;
  options: CustomizationOption[];
  required: boolean;
  maxSelections: number;
}

export interface CustomizationOption {
  id: string;
  name: string;
  priceModifier: number;
}

// =============================================================================
// DRIVER TYPES
// =============================================================================

export type DriverStatus = 'available' | 'busy' | 'offline';

export interface Driver {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  photoURL?: string;
  fcmToken?: string;
  vehicleType: 'car' | 'motorcycle' | 'bicycle' | 'scooter';
  vehiclePlate?: string;
  licenseNumber: string;
  status: DriverStatus;
  isOnline: boolean;
  currentOrderId?: string;
  rating: number;
  ratingCount: number;
  completedDeliveries: number;
  stripeAccountId?: string;
  stripeAccountStatus?: 'pending' | 'active' | 'restricted';
  // Cached metrics (pre-calculated)
  cachedMetrics?: DriverMetrics;
  metricsUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DriverLocation {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  accuracy?: number;
  updatedAt: Date;
}

export interface DriverMetrics {
  totalDeliveries: number;
  weeklyDeliveries: number;
  monthlyDeliveries: number;
  completionRate: number;
  acceptanceRate: number;
  averageRating: number;
  totalRatings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  weeklyOnlineHours: number;
  monthlyOnlineHours: number;
  totalOnlineHours: number;
  weeklyDistance: number;
  monthlyDistance: number;
  totalDistance: number;
}

export interface DriverSession {
  id: string;
  driverId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  ordersCompleted: number;
  distanceTraveled: number; // km
  earnings: number;
}

// =============================================================================
// ADDRESS TYPES
// =============================================================================

export interface Address {
  id?: string;
  label?: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  instructions?: string;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export type PayoutType = 'restaurant' | 'driver';
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payout {
  id: string;
  type: PayoutType;
  recipientId: string;
  recipientName: string;
  orderId: string;
  amount: number;
  platformFee: number;
  deliveryFee?: number;
  tip?: number;
  stripeTransferId?: string;
  status: PayoutStatus;
  createdAt: Date;
  processedAt?: Date;
}

export interface JournalEntry {
  id: string;
  type: 'payment_received' | 'order_revenue' | 'refund' | 'payout';
  orderId: string;
  entries: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  createdAt: Date;
}

export interface JournalLine {
  account: string;
  debit: number;
  credit: number;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type NotificationType =
  | 'new_order'
  | 'order_accepted'
  | 'order_preparing'
  | 'order_ready'
  | 'driver_assigned'
  | 'order_picked_up'
  | 'order_delivered'
  | 'order_cancelled'
  | 'payment_received'
  | 'tip_received'
  | 'payout_processed';

export interface PushNotification {
  title: string;
  body: string;
  type: NotificationType;
  orderId?: string;
  data?: Record<string, string>;
}

// =============================================================================
// AI TYPES
// =============================================================================

export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'inactive' | 'error';
  workflowAIId?: string;
  tasksCompleted: number;
  tasksInProgress: number;
  lastActiveAt?: Date;
  createdAt: Date;
}

export interface AITask {
  id: string;
  employeeId: string;
  type: string;
  priority: number;
  payload: Record<string, string>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: Record<string, string>;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface AIDecision {
  action: string;
  reasoning: string;
  confidence: number;
  data?: Record<string, unknown>;
}

// =============================================================================
// EVENT TYPES (Pub/Sub)
// =============================================================================

export enum EventType {
  // Order Events
  ORDER_CREATED = 'order.created',
  ORDER_ACCEPTED = 'order.accepted',
  ORDER_PREPARING = 'order.preparing',
  ORDER_READY = 'order.ready',
  ORDER_PICKED_UP = 'order.picked_up',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',

  // Driver Events
  DRIVER_ONLINE = 'driver.online',
  DRIVER_OFFLINE = 'driver.offline',
  DRIVER_ASSIGNED = 'driver.assigned',
  DRIVER_LOCATION_UPDATED = 'driver.location.updated',

  // Payment Events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_SUCCEEDED = 'payment.succeeded',
  PAYMENT_FAILED = 'payment.failed',
  REFUND_INITIATED = 'refund.initiated',
  REFUND_COMPLETED = 'refund.completed',

  // Payout Events
  PAYOUT_CALCULATED = 'payout.calculated',
  PAYOUT_PROCESSED = 'payout.processed',
  PAYOUT_FAILED = 'payout.failed',
}

export interface BaseEvent {
  type: EventType;
  timestamp: Date;
  correlationId: string;
}

export interface OrderEvent extends BaseEvent {
  orderId: string;
  customerId: string;
  restaurantId: string;
  driverId?: string;
  total?: number;
  status?: OrderStatus;
}

export interface DriverEvent extends BaseEvent {
  driverId: string;
  orderId?: string;
  location?: DriverLocation;
}

export interface PaymentEvent extends BaseEvent {
  orderId: string;
  customerId: string;
  amount: number;
  paymentIntentId?: string;
  error?: string;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
