
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Ship, Asteroid, Bullet, Particle, AsteroidSize, GameStatus 
} from './types';
import { 
  FRICTION, SHIP_ROT_FRICTION, SHIP_SIZE, SHIP_THRUST, SHIP_ROT_ACCEL, 
  BULLET_SPEED, BULLET_LIFE, BULLET_COOLDOWN, 
  ASTEROID_MAX_SPEED, START_LIVES,
  ASTEROID_POINTS_LARGE, ASTEROID_POINTS_MEDIUM, ASTEROID_POINTS_SMALL,
  ASTEROID_HEALTH_LARGE, ASTEROID_HEALTH_MEDIUM, ASTEROID_HEALTH_SMALL,
  ASTEROID_RADII, INVINCIBILITY_TIME, RESPAWN_DELAY, SPAWN_INTERVAL,
  PARTICLE_LIFE, PARTICLE_FADE_START
} from './constants';
import { 
  randomRange, wrapAround, distanceBetween, generateAsteroidPoints 
} from './utils';

const SHIP_COLOR = '#6fc3d4';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const livesRef = useRef(START_LIVES);

  // Sync ref to lives state to avoid stale closure in game loop
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  // Game Engine Refs
  const shipRef = useRef<Ship>({
    id: 'ship',
    x: 0,
    y: 0,
    radius: SHIP_SIZE / 2,
    velocity: { dx: 0, dy: 0 },
    angle: -Math.PI / 2,
    rotationVelocity: 0,
    isThrusting: false,
    canShoot: true,
    shootCooldown: 0,
    invincibleTimer: 0,
    respawnTimer: 0
  });

  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const requestRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);

  const initGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    shipRef.current = {
      ...shipRef.current,
      x: canvas.width / 2,
      y: canvas.height / 2,
      velocity: { dx: 0, dy: 0 },
      angle: -Math.PI / 2,
      rotationVelocity: 0,
      isThrusting: false,
      invincibleTimer: INVINCIBILITY_TIME,
      respawnTimer: 0
    };

    setLives(START_LIVES);
    setScore(0);
    spawnTimerRef.current = 0;
    
    asteroidsRef.current = [];
    particlesRef.current = [];
    for (let i = 0; i < 4; i++) {
      spawnRandomAsteroid(true);
    }
    bulletsRef.current = [];
  }, []);

  const spawnParticles = (x: number, y: number, count: number, color: string, speedMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        radius: randomRange(1, 2.5),
        velocity: {
          dx: randomRange(-1, 1) * 2 * speedMult,
          dy: randomRange(-1, 1) * 2 * speedMult
        },
        life: PARTICLE_LIFE,
        color
      });
    }
  };

  const spawnRandomAsteroid = (initial: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let x, y;
    if (initial) {
      do {
        x = Math.random() * canvas.width;
        y = Math.random() * canvas.height;
      } while (distanceBetween({ x, y }, { x: shipRef.current.x, y: shipRef.current.y }) < 150);
    } else {
      const side = Math.floor(Math.random() * 4);
      if (side === 0) { x = 0; y = Math.random() * canvas.height; }
      else if (side === 1) { x = canvas.width; y = Math.random() * canvas.height; }
      else if (side === 2) { x = Math.random() * canvas.width; y = 0; }
      else { x = Math.random() * canvas.width; y = canvas.height; }
    }

    const sizes = [AsteroidSize.LARGE, AsteroidSize.MEDIUM, AsteroidSize.SMALL];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    asteroidsRef.current.push(generateAsteroid(x, y, size));
  };

  const generateAsteroid = (x: number, y: number, size: AsteroidSize): Asteroid => {
    const radius = ASTEROID_RADII[size];
    let health = ASTEROID_HEALTH_SMALL;
    if (size === AsteroidSize.LARGE) health = ASTEROID_HEALTH_LARGE;
    if (size === AsteroidSize.MEDIUM) health = ASTEROID_HEALTH_MEDIUM;

    return {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      radius,
      velocity: {
        dx: randomRange(-ASTEROID_MAX_SPEED, ASTEROID_MAX_SPEED),
        dy: randomRange(-ASTEROID_MAX_SPEED, ASTEROID_MAX_SPEED)
      },
      size,
      health,
      points: generateAsteroidPoints(radius, size === AsteroidSize.LARGE ? 12 : 8),
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: randomRange(-0.02, 0.02)
    };
  };

  const handleShoot = () => {
    const ship = shipRef.current;
    if (ship.respawnTimer > 0) return;
    if (ship.shootCooldown <= 0) {
      const bullet: Bullet = {
        id: Math.random().toString(36).substr(2, 9),
        x: ship.x + Math.cos(ship.angle) * ship.radius,
        y: ship.y + Math.sin(ship.angle) * ship.radius,
        radius: 2,
        velocity: {
          dx: Math.cos(ship.angle) * BULLET_SPEED + ship.velocity.dx,
          dy: Math.sin(ship.angle) * BULLET_SPEED + ship.velocity.dy
        },
        life: BULLET_LIFE
      };
      bulletsRef.current.push(bullet);
      ship.shootCooldown = BULLET_COOLDOWN;
    }
  };

  const update = () => {
    const canvas = canvasRef.current;
    if (!canvas || gameStatus !== GameStatus.PLAYING) return;

    const keys = keysRef.current;
    const ship = shipRef.current;

    // 1. Spawning Logic
    spawnTimerRef.current++;
    if (spawnTimerRef.current >= SPAWN_INTERVAL) {
      spawnTimerRef.current = 0;
      spawnRandomAsteroid();
    }

    // 2. Particles
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    particlesRef.current.forEach(p => {
      p.x += p.velocity.dx;
      p.y += p.velocity.dy;
      p.life--;
      const wrapped = wrapAround(p.x, p.y, canvas.width, canvas.height);
      p.x = wrapped.x;
      p.y = wrapped.y;
    });

    // 3. Ship Controls & Respawn
    if (ship.respawnTimer > 0) {
      ship.respawnTimer--;
      if (ship.respawnTimer === 0) {
        // Only decrement lives and check game over at the moment of respawn
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameStatus(GameStatus.GAMEOVER);
          } else {
            ship.x = canvas.width / 2;
            ship.y = canvas.height / 2;
            ship.velocity = { dx: 0, dy: 0 };
            ship.rotationVelocity = 0;
            ship.invincibleTimer = INVINCIBILITY_TIME;
          }
          return newLives;
        });
      }
    } else {
      if (ship.invincibleTimer > 0) ship.invincibleTimer--;
      
      // Momentum-based Rotation
      if (keys.has('ArrowLeft')) {
        ship.rotationVelocity -= SHIP_ROT_ACCEL;
      } else if (keys.has('ArrowRight')) {
        ship.rotationVelocity += SHIP_ROT_ACCEL;
      }
      ship.rotationVelocity *= SHIP_ROT_FRICTION;
      ship.angle += ship.rotationVelocity;

      ship.isThrusting = keys.has('ArrowUp');
      if (keys.has(' ')) handleShoot();

      if (ship.isThrusting) {
        ship.velocity.dx += Math.cos(ship.angle) * SHIP_THRUST;
        ship.velocity.dy += Math.sin(ship.angle) * SHIP_THRUST;
      }
      ship.velocity.dx *= FRICTION;
      ship.velocity.dy *= FRICTION;
      ship.x += ship.velocity.dx;
      ship.y += ship.velocity.dy;
      
      const wrappedShip = wrapAround(ship.x, ship.y, canvas.width, canvas.height);
      ship.x = wrappedShip.x;
      ship.y = wrappedShip.y;

      if (ship.shootCooldown > 0) ship.shootCooldown--;
    }

    // 4. Update Bullets
    bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);
    bulletsRef.current.forEach(b => {
      b.x += b.velocity.dx;
      b.y += b.velocity.dy;
      b.life--;
      const wrapped = wrapAround(b.x, b.y, canvas.width, canvas.height);
      b.x = wrapped.x;
      b.y = wrapped.y;
    });

    // 5. Update Asteroids
    asteroidsRef.current.forEach(a => {
      a.x += a.velocity.dx;
      a.y += a.velocity.dy;
      a.rotation += a.rotSpeed;
      const wrapped = wrapAround(a.x, a.y, canvas.width, canvas.height);
      a.x = wrapped.x;
      a.y = wrapped.y;
    });

    // 6. Collisions
    if (ship.respawnTimer <= 0) {
        checkCollisions();
    }
  };

  const checkCollisions = () => {
    const ship = shipRef.current;
    const asteroids = asteroidsRef.current;
    const bullets = bulletsRef.current;

    // Bullet vs Asteroid
    for (let i = bullets.length - 1; i >= 0; i--) {
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const b = bullets[i];
        const a = asteroids[j];
        if (distanceBetween({ x: b.x, y: b.y }, { x: a.x, y: a.y }) < a.radius) {
          bullets.splice(i, 1);
          
          // Transfer momentum from bullet to asteroid - Decreased multiplier (was 0.15)
          a.velocity.dx += b.velocity.dx * 0.05;
          a.velocity.dy += b.velocity.dy * 0.05;

          // Spawn hit particles
          const hitColor = a.health > 1 ? '#aaf' : '#fff';
          spawnParticles(b.x, b.y, randomRange(2, 4), hitColor, 0.5);

          a.health--;
          if (a.health <= 0) {
            handleAsteroidSplit(a, j);
          }
          break;
        }
      }
    }

    // Ship vs Asteroid (only if not invincible)
    if (ship.invincibleTimer <= 0) {
      for (let i = 0; i < asteroids.length; i++) {
        const a = asteroids[i];
        if (distanceBetween({ x: ship.x, y: ship.y }, { x: a.x, y: a.y }) < ship.radius + a.radius) {
          handlePlayerDeath(a);
          break;
        }
      }
    }
  };

  const handleAsteroidSplit = (a: Asteroid, index: number) => {
    let points = 0;
    let particleCount = 0;
    const color = '#fff';

    if (a.size === AsteroidSize.LARGE) {
      points = ASTEROID_POINTS_LARGE;
      particleCount = 16;
      asteroidsRef.current.push(generateAsteroid(a.x, a.y, AsteroidSize.MEDIUM));
      asteroidsRef.current.push(generateAsteroid(a.x, a.y, AsteroidSize.MEDIUM));
    } else if (a.size === AsteroidSize.MEDIUM) {
      points = ASTEROID_POINTS_MEDIUM;
      particleCount = 6;
      asteroidsRef.current.push(generateAsteroid(a.x, a.y, AsteroidSize.SMALL));
      asteroidsRef.current.push(generateAsteroid(a.x, a.y, AsteroidSize.SMALL));
    } else {
      points = ASTEROID_POINTS_SMALL;
      particleCount = 9;
    }
    
    spawnParticles(a.x, a.y, particleCount, color);

    setScore(prev => {
      const newScore = prev + points;
      if (newScore > highScore) setHighScore(newScore);
      return newScore;
    });
    asteroidsRef.current.splice(index, 1);
  };

  const handlePlayerDeath = (killer: Asteroid) => {
    // Spawn ship death particles
    spawnParticles(shipRef.current.x, shipRef.current.y, 5, SHIP_COLOR, 1.5);
    
    // Spawn small asteroid at ship death location inheriting killer's momentum
    const fragment = generateAsteroid(shipRef.current.x, shipRef.current.y, AsteroidSize.SMALL);
    fragment.velocity.dx = killer.velocity.dx * 1.2;
    fragment.velocity.dy = killer.velocity.dy * 1.2;
    asteroidsRef.current.push(fragment);

    // Enter respawn phase, but do not decrement lives state yet (delayed until respawn)
    shipRef.current.respawnTimer = RESPAWN_DELAY;
    shipRef.current.isThrusting = false;
    shipRef.current.rotationVelocity = 0;
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.save();
      let opacity = 1;
      if (p.life < PARTICLE_FADE_START) {
        opacity = p.life / PARTICLE_FADE_START;
      }
      ctx.globalAlpha = opacity;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Bullets
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth = 2;
    bulletsRef.current.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw Asteroids
    asteroidsRef.current.forEach(a => {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      ctx.beginPath();
      ctx.strokeStyle = a.health > 1 ? '#aaf' : '#fff';
      ctx.lineWidth = 1.5;
      ctx.moveTo(a.points[0].x, a.points[0].y);
      for (let i = 1; i < a.points.length; i++) {
        ctx.lineTo(a.points[i].x, a.points[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    // Draw Ship
    const ship = shipRef.current;
    if (gameStatus === GameStatus.PLAYING && ship.respawnTimer <= 0) {
      if (ship.invincibleTimer > 0 && Math.floor(ship.invincibleTimer / 5) % 2 === 0) {
        // Blinking
      } else {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);
        
        ctx.strokeStyle = ship.invincibleTimer > 0 ? '#ff0' : SHIP_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ship.radius, 0);
        ctx.lineTo(-ship.radius, ship.radius * 0.7);
        ctx.lineTo(-ship.radius * 0.5, 0);
        ctx.lineTo(-ship.radius, -ship.radius * 0.7);
        ctx.closePath();
        ctx.stroke();

        if (ship.isThrusting && Math.random() > 0.2) {
          ctx.strokeStyle = '#f80';
          ctx.beginPath();
          ctx.moveTo(-ship.radius * 0.6, 0);
          ctx.lineTo(-ship.radius * 1.5, 0);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  };

  const gameLoop = useCallback(() => {
    update();
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.key);
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  const startGame = () => {
    initGame();
    setGameStatus(GameStatus.PLAYING);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      {/* HUD */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start pointer-events-none z-10 font-mono text-xl text-white">
        <div>
          <div className="opacity-70 text-sm">SCORE</div>
          <div className={`${score >= highScore && score > 0 ? 'retro-glow' : ''} text-2xl font-bold transition-all duration-300`}>
            {score.toString().padStart(6, '0')}
          </div>
          <div className="mt-4 flex gap-4">
            {/* Show n-1 lives as requested. Visual deduction happens when `lives` state changes at respawn. */}
            {Array.from({ length: Math.max(0, lives - 1) }).map((_, i) => (
              <svg key={i} width="16" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)' }}>
                <path 
                  d="M18,10 L2,17 L6,10 L2,3 Z" 
                  fill="none" 
                  stroke={SHIP_COLOR} 
                  strokeWidth="2"
                />
              </svg>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="opacity-70 text-sm">HI-SCORE</div>
          <div className="text-2xl">{highScore.toString().padStart(6, '0')}</div>
        </div>
      </div>

      {/* Overlays */}
      {gameStatus === GameStatus.START && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20">
          <h1 className="text-4xl md:text-6xl font-bold mb-12 retro-glow tracking-tighter text-white italic text-center px-4">
            LEGALLY DISTINCT <br/> ASTEROID-SHOOTING GAME
          </h1>
          <button 
            onClick={startGame}
            className="px-12 py-4 border-4 border-white text-white font-bold text-2xl hover:bg-white hover:text-black transition-all transform hover:scale-110 active:scale-95"
          >
            START MISSION
          </button>
          <div className="mt-20 text-2xl text-gray-500 font-mono text-center opacity-40 uppercase tracking-widest">
            Defend your sector at all costs
          </div>
        </div>
      )}

      {gameStatus === GameStatus.GAMEOVER && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/30 backdrop-blur-md z-20">
          <h2 className="text-8xl font-black mb-2 text-red-500 retro-glow-red drop-shadow-lg">GAME OVER</h2>
          <p className="text-2xl text-white mb-8 font-mono">FINAL SCORE: {score}</p>
          <button 
            onClick={startGame}
            className="px-10 py-4 bg-white text-black font-bold text-xl hover:bg-gray-200 transition-all transform hover:scale-105"
          >
            RETRY MISSION
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
