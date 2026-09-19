export type SubscriptionPlanTier =
  | 'trial_60_days_1_rupee'
  | 'monthly_1499'
  | 'six_months_8549'
  | 'yearly_17089';

export interface SubscriptionPlan {
  id: SubscriptionPlanTier | string;
  name: string;
  price: number | string;
  displayPrice?: string;
  period: string;
  jobLimit?: number;
  aiScreeningLimit?: number;
  description: string;
  features: readonly string[] | string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  ctaText?: string;
  ctaVariant?: 'primary' | 'secondary' | 'outline';
}
