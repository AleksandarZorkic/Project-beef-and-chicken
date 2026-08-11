const fallbackSeed = 0x6d2b79f5;
const minimumInt32 = -2_147_483_648;
const maximumInt32 = 2_147_483_647;

export class DeliveryRushRandom {
  private state: number;

  constructor(seed: number) {
    if (!Number.isInteger(seed) || seed < minimumInt32 || seed > maximumInt32) {
      throw new RangeError("Seed must be a valid 32-bit integer.");
    }

    this.state = seed >>> 0;

    if (this.state === 0) {
      this.state = fallbackSeed;
    }
  }

  nextUInt(): number {
    let value = this.state;

    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;

    this.state = value >>> 0;

    return this.state;
  }

  nextInt(exclusiveMaximum: number): number {
    if (!Number.isInteger(exclusiveMaximum) || exclusiveMaximum <= 0) {
      throw new RangeError("Exclusive maximum must be a positive integer.");
    }

    return this.nextUInt() % exclusiveMaximum;
  }
}
