// utils/billingUtils.ts
import { BillingStatus, IBilling } from '../models/Website';

/**
 * Add days to a date
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Add months to a date
 */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Calculate next due date based on billing cycle
 */
export const calculateNextDueDate = (
  startDate: Date,
  cycle: 'monthly' | 'quarterly' | 'yearly'
): Date => {
  switch (cycle) {
    case 'monthly':
      return addMonths(startDate, 1);
    case 'quarterly':
      return addMonths(startDate, 3);
    case 'yearly':
      return addMonths(startDate, 12);
    default:
      return addMonths(startDate, 1);
  }
};

/**
 * Initialize billing when website is deployed
 */
export const initializeBilling = (
  plan?: string,
  price?: number,
  cycle: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
): Partial<IBilling> => {
  const now = new Date();
  const graceEndsAt = addDays(now, 5); // 5-day grace period
  
  return {
    status: BillingStatus.PENDING,
    plan,
    price,
    billingCycle: cycle,
    activatedAt: now,
    dueAt: graceEndsAt,
    graceEndsAt,
  };
};

/**
 * Check if website billing is suspended
 */
export const isBillingSuspended = (billingStatus: BillingStatus | string): boolean => {
  return billingStatus === BillingStatus.SUSPENDED;
};

/**
 * Check if website billing is overdue
 */
export const isBillingOverdue = (billingStatus: BillingStatus | string): boolean => {
  return billingStatus === BillingStatus.OVERDUE;
};

/**
 * Get days remaining until due date
 */
export const getDaysRemaining = (dueDate: Date): number => {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Format billing status for display
 */
export const formatBillingStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    PENDING: 'Payment Pending',
    ACTIVE: 'Active',
    OVERDUE: 'Payment Overdue',
    SUSPENDED: 'Suspended',
  };
  return statusMap[status] || status;
};