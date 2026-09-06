import { describe as describeSuite, expect, it } from 'vitest';
import { nextScenarioName } from '../naming';
import { vehicleCalculator } from '../../calculators/vehicle';
import { vehicleDefaults } from '../../calculators/vehicle/presets';

/** The real describe() the calculator shell uses, so these test the actual naming, not a stand-in. */
const describeVehicle = (i: unknown) => vehicleCalculator.nameFor!(vehicleCalculator.normalize(i));

const base = vehicleCalculator.normalize(vehicleDefaults);
const withYears = (years: number) => ({ ...base, shared: { ...base.shared, ownershipYears: years } });

describeSuite('scenario auto-naming', () => {
  it('refreshes a generated name when the numbers it describes change', () => {
    const five = withYears(5);
    const nine = withYears(9);
    const generated = describeVehicle(five);
    // This is the bug that prompted the rule: the label said one thing, the scenario held another.
    expect(generated).toContain('5 yr');
    const next = nextScenarioName(generated, describeVehicle, five, nine);
    expect(next).not.toBeNull();
    expect(next).toContain('9 yr');
    expect(next).not.toContain('5 yr');
  });

  it('leaves a name the user typed completely alone', () => {
    const five = withYears(5);
    const nine = withYears(9);
    for (const own of ['My commute plan', 'Dad’s car', 'Scenario A', '']) {
      expect(nextScenarioName(own, describeVehicle, five, nine)).toBeNull();
    }
  });

  it("leaves a preset's own name alone, so the example it started from stays recorded", () => {
    const preset = vehicleCalculator.presets[0];
    // A preset name is not the generated form, so it must not be treated as ours to overwrite.
    expect(preset.name).not.toBe(describeVehicle(base));
    expect(nextScenarioName(preset.name, describeVehicle, withYears(5), withYears(9))).toBeNull();
  });

  it('returns null when the generated name would not actually change', () => {
    const five = withYears(5);
    const generated = describeVehicle(five);
    // Editing something the name does not mention must not cause a pointless rename.
    const otherEdit = { ...five, a: { ...five.a, tireSetCost: 1234 } };
    expect(describeVehicle(otherEdit)).toBe(generated);
    expect(nextScenarioName(generated, describeVehicle, five, otherEdit)).toBeNull();
  });

  it('follows a swap, which reverses the two option names', () => {
    const swapped = vehicleCalculator.swap!(base);
    const generated = describeVehicle(base);
    const next = nextScenarioName(generated, describeVehicle, base, swapped);
    expect(next).not.toBeNull();
    expect(next).not.toBe(generated);
    // The same two cars, named the other way round.
    expect(next).toContain(base.b.name.split(' ')[0]);
  });

  it('keeps a shared link honest: the name travels with inputs that match it', () => {
    // Names only went stale because they were never refreshed. With the rule applied, the name a
    // scenario carries into a share link is the one its own inputs generate.
    const nine = withYears(9);
    const nameAfterEdit = nextScenarioName(describeVehicle(withYears(5)), describeVehicle, withYears(5), nine)!;
    expect(nameAfterEdit).toBe(describeVehicle(nine));
  });
});
