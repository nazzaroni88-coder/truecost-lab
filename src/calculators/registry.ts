import type { CalculatorDefinition } from './types';
import { vehicleCalculator } from './vehicle';
import { rentBuyCalculator } from './rentBuy';
import { debtInvestCalculator } from './debtInvest';
import { purchaseInvestCalculator } from './purchaseInvest';
import { customCalculator } from './custom';

export type AnyCalculator = CalculatorDefinition<any, any>;

export const REGISTRY: AnyCalculator[] = [vehicleCalculator, rentBuyCalculator, debtInvestCalculator, purchaseInvestCalculator, customCalculator];

export function getCalculatorBySlug(slug: string): AnyCalculator | undefined {
  return REGISTRY.find((c) => c.slug === slug);
}
export function getCalculatorById(id: string): AnyCalculator | undefined {
  return REGISTRY.find((c) => c.id === id);
}
