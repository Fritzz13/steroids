
export type Point = {
  x: number;
  y: number;
};

export type Velocity = {
  dx: number;
  dy: number;
};

export enum AsteroidSize {
  LARGE = 3,
  MEDIUM = 2,
  SMALL = 1
}

export interface Entity {
  id: string;
  x: number;
  y: number;
  radius: number;
  velocity: Velocity;
}

export interface Asteroid extends Entity {
  size: AsteroidSize;
  points: Point[];
  rotation: number;
  rotSpeed: number;
  health: number; // Ticks/Shots needed to split
}

export interface Bullet extends Entity {
  life: number; // Ticks until expiration
}

export interface Particle extends Entity {
  life: number;
  color: string;
}

export interface Ship extends Entity {
  angle: number; // In radians
  rotationVelocity: number;
  isThrusting: boolean;
  canShoot: boolean;
  shootCooldown: number;
  invincibleTimer: number; // Ticks of invincibility
  respawnTimer: number; // Ticks until reappearing
}

export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER'
}
