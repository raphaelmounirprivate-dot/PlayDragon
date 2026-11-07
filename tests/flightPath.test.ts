import { describe, expect, it } from 'vitest';
import { castlePosition, createFlightCurve, riverX, terrainHeight } from '../src/world/flightPath';
import { FLIGHT_ALTITUDE, PATH_LENGTH } from '../src/config';

describe('flight path', () => {
  it('keeps the river valley low', () => {
    for (let z = 0; z > -PATH_LENGTH + 600; z -= 250) {
      expect(terrainHeight(riverX(z), z)).toBeLessThan(30);
    }
  });

  it('keeps the dragon route above the terrain', () => {
    const curve = createFlightCurve();
    for (let i = 0; i <= 100; i++) {
      const p = curve.getPointAt(i / 100);
      expect(p.y - terrainHeight(p.x, p.z)).toBeGreaterThan(60);
    }
    expect(curve.getPointAt(0.5).y).toBeCloseTo(FLIGHT_ALTITUDE);
  });

  it('keeps an open basin around the castle so the dragon can circle it', () => {
    const castle = castlePosition();
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      for (const radius of [320, 400, 480, 560]) {
        const x = castle.x + Math.cos(angle) * radius;
        const z = castle.z + Math.sin(angle) * radius;
        expect(terrainHeight(x, z)).toBeLessThan(castle.y);
      }
    }
  });

  it('places the castle on a hill at the end of the path', () => {
    const castle = castlePosition();
    expect(castle.z).toBe(-PATH_LENGTH);
    expect(terrainHeight(castle.x, castle.z)).toBeGreaterThanOrEqual(castle.y - 1);
  });
});
