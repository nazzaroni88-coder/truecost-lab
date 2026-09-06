import { describe, expect, it } from 'vitest';
import { fmtDelta, fmtMoney, fmtMoneyCompact, fmtMonthsLong, fmtNumber, fmtPct, fmtYears, roundHeadline } from '../format';
import { mergeWithDefaults } from '../../calculators/types';

describe('format', () => {
  it('formats money with a true minus sign and no cents by default', () => {
    expect(fmtMoney(27430.4)).toBe('$27,430');
    expect(fmtMoney(-1200)).toBe('−$1,200');
    expect(fmtMoney(0.93, 2)).toBe('$0.93');
    expect(fmtMoney(-0.001)).toBe('$0');
    expect(fmtMoney(NaN)).toBe('—');
  });
  it('compacts large numbers', () => {
    expect(fmtMoneyCompact(950)).toBe('$950');
    expect(fmtMoneyCompact(1234)).toBe('$1.2k');
    expect(fmtMoneyCompact(27430)).toBe('$27.4k');
    expect(fmtMoneyCompact(150000)).toBe('$150k');
    expect(fmtMoneyCompact(1_250_000)).toBe('$1.3M');
    expect(fmtMoneyCompact(-27430)).toBe('−$27.4k');
  });
  it('rounds to negative decimals', () => {
    expect(fmtNumber(53_249, -2)).toBe('53,200');
    expect(fmtNumber(12.345, 1)).toBe('12.3');
  });
  it('percent and years', () => {
    expect(fmtPct(6.5)).toBe('6.5%');
    expect(fmtPct(6.5, 0)).toBe('7%');
    expect(fmtYears(0.5)).toBe('6 months');
    expect(fmtYears(1)).toBe('1 year');
    expect(fmtYears(2.5)).toBe('2 yr 6 mo');
    expect(fmtYears(3.99)).toBe('4 years');
    expect(fmtMonthsLong(55)).toBe('4 years, 7 months');
    expect(fmtMonthsLong(12)).toBe('1 year');
    expect(fmtMonthsLong(0)).toBe('0 months');
  });
  it('headline rounding uses sensible increments', () => {
    expect(roundHeadline(11897)).toBe(11900);
    expect(roundHeadline(438)).toBe(438);
    expect(roundHeadline(123456)).toBe(123500);
    expect(roundHeadline(-24380)).toBe(-24400);
  });
  it('signed deltas', () => {
    expect(fmtDelta(500)).toBe('+$500');
    expect(fmtDelta(-500)).toBe('−$500');
    expect(fmtDelta(0.2)).toBe('$0');
  });
});

describe('mergeWithDefaults', () => {
  const defaults = { name: 'x', price: 10, nested: { rate: 5, on: true }, list: [1, 2], nullable: null as number | null };
  it('keeps only known keys and coerces types', () => {
    const out = mergeWithDefaults(defaults, { name: 'y', price: '20', nested: { rate: 'nope', on: 'yes' }, extra: 1, list: 'bad', nullable: 3 });
    expect(out).toEqual({ name: 'y', price: 20, nested: { rate: 5, on: true }, list: [1, 2], nullable: 3 });
  });
  it('falls back entirely on garbage', () => {
    expect(mergeWithDefaults(defaults, null)).toEqual(defaults);
    expect(mergeWithDefaults(defaults, 'str')).toEqual(defaults);
    expect(mergeWithDefaults(defaults, { price: Infinity })).toEqual(defaults);
  });
});
