
import { Point, Velocity } from './types';

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const wrapAround = (x: number, y: number, width: number, height: number): Point => {
  let nx = x;
  let ny = y;
  if (x < 0) nx = width;
  else if (x > width) nx = 0;
  if (y < 0) ny = height;
  else if (y > height) ny = 0;
  return { x: nx, y: ny };
};

export const distanceBetween = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const generateAsteroidPoints = (radius: number, segments: number = 8): Point[] => {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const offset = randomRange(radius * 0.7, radius * 1.3);
    points.push({
      x: Math.cos(angle) * offset,
      y: Math.sin(angle) * offset
    });
  }
  return points;
};
