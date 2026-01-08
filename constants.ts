
export const FPS = 60;
export const FRICTION = 0.99; // Ship linear friction
export const SHIP_ROT_FRICTION = 0.92; // Ship rotation friction
export const SHIP_SIZE = 20;
export const SHIP_THRUST = 0.15;
export const SHIP_ROT_ACCEL = 0.008; // Decreased acceleration for rotation (was 0.015)
export const BULLET_SPEED = 7;
export const BULLET_LIFE = 60; // 1 second at 60fps
export const BULLET_COOLDOWN = 15;
export const ASTEROID_MAX_SPEED = 2;
export const ASTEROID_MIN_SPEED = 0.5;
export const START_LIVES = 3;

export const ASTEROID_POINTS_LARGE = 20;
export const ASTEROID_POINTS_MEDIUM = 50;
export const ASTEROID_POINTS_SMALL = 100;

export const ASTEROID_HEALTH_LARGE = 4;
export const ASTEROID_HEALTH_MEDIUM = 2;
export const ASTEROID_HEALTH_SMALL = 1;

export const INVINCIBILITY_TIME = 90; // 1.5 seconds at 60fps
export const RESPAWN_DELAY = 60; // 1 second at 60fps
export const SPAWN_INTERVAL = 270; // New asteroid every 4.5 seconds (4.5 * 60 = 270)

export const ASTEROID_RADII = {
  3: 50,
  2: 25,
  1: 12
};

export const PARTICLE_LIFE = 60; // 1 second at 60fps
export const PARTICLE_FADE_START = 30; // Start fading after 0.5 seconds
