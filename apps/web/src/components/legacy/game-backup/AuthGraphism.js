'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SpaceEnemy } from './enemyfisics.js';

class ExplosionParticles {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  spawn(x, y, z, color = 0xffd400, count = 16) {
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.35 + 0.1;
      vels.push({
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed + (Math.random() - 0.5) * 0.2,
        z: (Math.random() - 0.5) * speed,
      });
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color,
      size: 0.5,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(pGeo, pMat);
    this.scene.add(points);

    this.particles.push({
      points,
      vels,
      life: 1.0,
      decay: Math.random() * 0.03 + 0.035,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * (dt * 60);

      if (p.life <= 0) {
        this.scene.remove(p.points);
        p.points.geometry.dispose();
        p.points.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.points.material.opacity = p.life;
        const pos = p.points.geometry.attributes.position.array;
        for (let j = 0; j < p.vels.length; j++) {
          pos[j * 3] += p.vels[j].x * (dt * 60);
          pos[j * 3 + 1] += p.vels[j].y * (dt * 60);
          pos[j * 3 + 2] += p.vels[j].z * (dt * 60);
        }
        p.points.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  dispose() {
    this.particles.forEach(p => {
      this.scene.remove(p.points);
      p.points.geometry.dispose();
      p.points.material.dispose();
    });
    this.particles = [];
  }
}

export function AuthGraphism() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // 1. Scene & Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060609);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    const cameraBasePos = { x: 0, y: 0, z: 45 };
    camera.position.set(cameraBasePos.x, cameraBasePos.y, cameraBasePos.z);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Lighting (Multi-color Cosmic Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffd400, 2.2);
    dirLight.position.set(5, 15, 20);
    scene.add(dirLight);

    const cyanLight = new THREE.PointLight(0x00ffff, 3.0, 60);
    cyanLight.position.set(-18, -10, 15);
    scene.add(cyanLight);

    const magentaLight = new THREE.PointLight(0xff00aa, 2.8, 60);
    magentaLight.position.set(18, 15, 15);
    scene.add(magentaLight);

    // 3. Multi-Color Dynamic Warp Starfield
    const starsCount = 650;
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);

    const colorPalette = [
      new THREE.Color(0x00f0ff), // Electric Cyan
      new THREE.Color(0xa855f7), // Neon Violet
      new THREE.Color(0xff00aa), // Hot Magenta
      new THREE.Color(0xffd700), // Stellar Gold
      new THREE.Color(0x38bdf8), // Ice Blue
      new THREE.Color(0xffffff), // Crisp White
    ];

    for (let i = 0; i < starsCount; i++) {
      const idx = i * 3;
      starPositions[idx] = (Math.random() - 0.5) * 160;
      starPositions[idx + 1] = (Math.random() - 0.5) * 160;
      starPositions[idx + 2] = -Math.random() * 120;

      const col = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      starColors[idx] = col.r;
      starColors[idx + 1] = col.g;
      starColors[idx + 2] = col.b;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
      size: 0.45,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);

    // 4. High-Tech Cyber Starfighter (Oriented along Y-axis for top-down 2D/3D gameplay)
    const playerShip = new THREE.Group();

    // Central Fuselage (Cone naturally points UP along +Y)
    const bodyGeo = new THREE.ConeGeometry(1.2, 4.8, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x180b30, roughness: 0.15, metalness: 0.85, emissive: 0x110424 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    playerShip.add(bodyMesh);

    // Swept Delta Wings (Extends along X, height along Y, thin along Z)
    const wingGeo = new THREE.BoxGeometry(4.8, 1.4, 0.2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x7832ff, roughness: 0.2, metalness: 0.8 });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    wingMesh.position.set(0, -0.6, 0);
    playerShip.add(wingMesh);

    // Angled Winglets (Tip points UP along +Y)
    const wingletGeo = new THREE.ConeGeometry(0.3, 1.4, 4);
    const wingletMat = new THREE.MeshStandardMaterial({ color: 0xffd400, roughness: 0.1, metalness: 0.9 });
    const leftWinglet = new THREE.Mesh(wingletGeo, wingletMat);
    leftWinglet.position.set(-2.4, -0.1, 0.1);
    playerShip.add(leftWinglet);

    const rightWinglet = new THREE.Mesh(wingletGeo, wingletMat);
    rightWinglet.position.set(2.4, -0.1, 0.1);
    playerShip.add(rightWinglet);

    // Glowing Cockpit Canopy (Protrudes forward on +Y and up on +Z towards camera)
    const cockpitGeo = new THREE.SphereGeometry(0.65, 16, 16);
    cockpitGeo.scale(0.85, 1.8, 0.6);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x007799,
      transparent: true,
      opacity: 0.9,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0.5, 0.4);
    playerShip.add(cockpit);

    // Dual Wing Cannons (Cylinders aligned with Y axis pointing UP)
    const cannonGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8);
    const cannonMat = new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.9, roughness: 0.2 });
    const leftCannon = new THREE.Mesh(cannonGeo, cannonMat);
    leftCannon.position.set(-1.4, 0.6, 0.1);
    playerShip.add(leftCannon);

    const rightCannon = new THREE.Mesh(cannonGeo, cannonMat);
    rightCannon.position.set(1.4, 0.6, 0.1);
    playerShip.add(rightCannon);

    const glowGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.set(-1.4, 1.5, 0.1);
    playerShip.add(leftGlow);

    const rightGlow = new THREE.Mesh(glowGeo, glowMat);
    rightGlow.position.set(1.4, 1.5, 0.1);
    playerShip.add(rightGlow);

    // Dual Rear Plasma Thruster Flares (Nozzles at -Y, flames pointing DOWN along -Y)
    const engineNozzleGeo = new THREE.CylinderGeometry(0.32, 0.22, 0.8, 12);
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.9, roughness: 0.3 });

    const leftNozzle = new THREE.Mesh(engineNozzleGeo, nozzleMat);
    leftNozzle.position.set(-0.65, -2.1, 0);
    playerShip.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(engineNozzleGeo, nozzleMat);
    rightNozzle.position.set(0.65, -2.1, 0);
    playerShip.add(rightNozzle);

    const flameGeo = new THREE.ConeGeometry(0.28, 1.8, 8);
    flameGeo.rotateZ(Math.PI); // Point flame cone DOWN along -Y
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });

    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.65, -3.2, 0);
    playerShip.add(leftFlame);

    const rightFlame = new THREE.Mesh(flameGeo, flameMat);
    rightFlame.position.set(0.65, -3.2, 0);
    playerShip.add(rightFlame);

    playerShip.position.set(0, -15, 0);
    scene.add(playerShip);

    // 5. Shared Geometries & Materials
    const geometries = {
      rock: new THREE.DodecahedronGeometry(1.8, 0),
      suicide: new THREE.ConeGeometry(1.2, 3, 3),
      orb: new THREE.IcosahedronGeometry(1.4, 0),
    };
    geometries.suicide.rotateZ(Math.PI); // Suicide drone nose points DOWN along -Y towards player

    const materials = {
      rock: new THREE.MeshStandardMaterial({ color: 0x5a4b7c, roughness: 0.7, metalness: 0.3 }),
      suicide: new THREE.MeshStandardMaterial({ color: 0xff2255, roughness: 0.2, metalness: 0.6, emissive: 0x330011 }),
      orb: new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.1, metalness: 0.9, emissive: 0x003344 }),
    };

    // Lasers (Cylinder aligned with Y axis pointing UP along trajectory)
    const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8);
    const laserMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    const explosionSystem = new ExplosionParticles(scene);

    const enemies = [];
    const lasers = [];
    const mouse = { x: 0, y: 0, over: false };
    let internalScore = 0;
    let spawnTimer = 0;
    let spawnInterval = 110;
    let laserTimer = 0;
    let lastTime = 0;
    let screenShake = 0;

    const xLimit = 26;
    const yLimit = 18;

    // Instant Autopilot Shutoff & Direct Cursor Control
    const updateMousePosition = (e) => {
      const rect = container.getBoundingClientRect();
      if (
        e.clientX >= rect.left - 20 &&
        e.clientX <= rect.right + 20 &&
        e.clientY >= rect.top - 20 &&
        e.clientY <= rect.bottom + 20
      ) {
        mouse.x = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
        mouse.y = Math.max(-1, Math.min(1, -((e.clientY - rect.top) / rect.height) * 2 + 1));
        mouse.over = true;
      } else {
        mouse.over = false;
      }
    };

    const handleMouseEnter = (e) => {
      updateMousePosition(e);
      mouse.over = true;
    };

    const handleMouseLeave = () => {
      mouse.over = false;
    };

    container.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    container.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    container.addEventListener('mousemove', updateMousePosition, { passive: true });
    container.addEventListener('pointerenter', handleMouseEnter, { passive: true });
    container.addEventListener('pointerleave', handleMouseLeave, { passive: true });
    container.addEventListener('pointermove', updateMousePosition, { passive: true });
    window.addEventListener('pointermove', updateMousePosition, { passive: true });


    const fireLasers = (x, y, currentScore) => {
      if (currentScore >= 25) {
        const offsets = [{ x: -1.2, vx: -0.08 }, { x: 0, vx: 0 }, { x: 1.2, vx: 0.08 }];
        offsets.forEach(off => {
          const laser = new THREE.Mesh(laserGeo, laserMat);
          laser.position.set(x + off.x, y + 2, 0);
          laser.userData = { vx: off.vx };
          scene.add(laser);
          lasers.push(laser);
        });
      } else if (currentScore >= 10) {
        [-1.0, 1.0].forEach(offsetX => {
          const laser = new THREE.Mesh(laserGeo, laserMat);
          laser.position.set(x + offsetX, y + 2, 0);
          laser.userData = { vx: 0 };
          scene.add(laser);
          lasers.push(laser);
        });
      } else {
        const laser = new THREE.Mesh(laserGeo, laserMat);
        laser.position.set(x, y + 2, 0);
        laser.userData = { vx: 0 };
        scene.add(laser);
        lasers.push(laser);
      }
    };

    const gameLoop = (time) => {
      rafRef.current = requestAnimationFrame(gameLoop);
      const dt = Math.min((time - lastTime) / 1000, 0.05) || 0.016;
      lastTime = time;

      // Pulse engine flames
      const flamePulse = 0.85 + Math.sin(time * 0.02) * 0.25;
      leftFlame.scale.set(1, flamePulse, 1);
      rightFlame.scale.set(1, flamePulse, 1);

      const starPos = starField.geometry.attributes.position.array;
      for (let i = 2; i < starsCount * 3; i += 3) {
        starPos[i] += 0.5 * (dt * 60);
        if (starPos[i] > 10) {
          starPos[i] = -120;
        }
      }
      starField.geometry.attributes.position.needsUpdate = true;

      let targetX = playerShip.position.x;
      let targetY = playerShip.position.y;

      if (mouse.over) {
        targetX = mouse.x * xLimit;
        targetY = mouse.y * yLimit;
      } else {
        if (enemies.length > 0) {
          let lowest = enemies[0];
          for (let i = 1; i < enemies.length; i++) {
            if (enemies[i].mesh.position.y < lowest.mesh.position.y) lowest = enemies[i];
          }
          targetX = lowest.mesh.position.x;
          targetY = -14 + Math.sin(Date.now() * 0.003) * 2;
        } else {
          targetX = Math.sin(Date.now() * 0.002) * (xLimit * 0.5);
          targetY = -14;
        }
      }

      const dx = (targetX - playerShip.position.x);
      playerShip.position.x += dx * 0.18 * (dt * 60);
      playerShip.position.y += (targetY - playerShip.position.y) * 0.18 * (dt * 60);
      playerShip.rotation.z = -dx * 0.05;
      playerShip.rotation.y = -dx * 0.07;

      laserTimer += dt * 60;
      const cadence = internalScore >= 25 ? 10 : (internalScore >= 10 ? 12 : 14);
      if (laserTimer >= cadence) {
        fireLasers(playerShip.position.x, playerShip.position.y, internalScore);
        laserTimer = 0;
      }

      for (let i = lasers.length - 1; i >= 0; i--) {
        lasers[i].position.y += 0.85 * (dt * 60);
        lasers[i].position.x += (lasers[i].userData.vx || 0) * (dt * 60);
        if (lasers[i].position.y > yLimit + 5) {
          scene.remove(lasers[i]);
          lasers.splice(i, 1);
        }
      }

      spawnTimer += dt * 60;
      if (spawnTimer >= spawnInterval) {
        const rand = Math.random();
        const type = rand > 0.65 ? 'suicide' : (rand > 0.35 ? 'orb' : 'rock');
        const enemy = new SpaceEnemy(type, xLimit, yLimit, geometries, materials);
        scene.add(enemy.mesh);
        enemies.push(enemy);
        spawnTimer = 0;
        if (spawnInterval > 30) spawnInterval -= 0.4;
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.update(dt, playerShip.position.x, yLimit, xLimit);

        let hit = false;
        for (let j = lasers.length - 1; j >= 0; j--) {
          if (enemy.mesh.position.distanceTo(lasers[j].position) < 2.3) {
            scene.remove(lasers[j]);
            lasers.splice(j, 1);
            enemy.takeDamage();

            explosionSystem.spawn(enemy.mesh.position.x, enemy.mesh.position.y, enemy.mesh.position.z, 0x00ffff, 5);

            if (enemy.hp <= 0) {
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          const explosionColor = enemy.type === 'suicide' ? 0xff2255 : (enemy.type === 'orb' ? 0x00ffff : 0xffd400);
          explosionSystem.spawn(enemy.mesh.position.x, enemy.mesh.position.y, enemy.mesh.position.z, explosionColor, 20);

          scene.remove(enemy.mesh);
          enemy.dispose();
          enemies.splice(i, 1);

          internalScore++;
          setScore(internalScore);
          screenShake = 0.3;
        }
      }

      explosionSystem.update(dt);

      if (screenShake > 0) {
        camera.position.x = cameraBasePos.x + (Math.random() - 0.5) * screenShake;
        camera.position.y = cameraBasePos.y + (Math.random() - 0.5) * screenShake;
        screenShake -= dt * 1.5;
        if (screenShake < 0) {
          screenShake = 0;
          camera.position.x = cameraBasePos.x;
          camera.position.y = cameraBasePos.y;
        }
      }

      renderer.render(scene, camera);
    };

    rafRef.current = requestAnimationFrame(gameLoop);

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mousemove', updateMousePosition);
      container.removeEventListener('pointerenter', handleMouseEnter);
      container.removeEventListener('pointerleave', handleMouseLeave);
      container.removeEventListener('pointermove', updateMousePosition);
      window.removeEventListener('pointermove', updateMousePosition);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      scene.remove(playerShip);
      scene.remove(starField);
      enemies.forEach(e => {
        scene.remove(e.mesh);
        e.dispose();
      });
      lasers.forEach(l => scene.remove(l));

      explosionSystem.dispose();

      bodyGeo.dispose();
      bodyMat.dispose();
      wingGeo.dispose();
      wingMat.dispose();
      wingletGeo.dispose();
      wingletMat.dispose();
      cockpitGeo.dispose();
      cockpitMat.dispose();
      cannonGeo.dispose();
      cannonMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      engineNozzleGeo.dispose();
      nozzleMat.dispose();
      flameGeo.dispose();
      flameMat.dispose();

      Object.values(geometries).forEach(g => g.dispose());
      Object.values(materials).forEach(m => m.dispose());
      laserGeo.dispose();
      laserMat.dispose();
      starsGeometry.dispose();
      starsMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="auth-graphism">
      <canvas ref={canvasRef} className="auth-graphism-canvas" />
      <div className="game-hud">
        <div className="game-hud-score">
          <span className="hud-kill-count">{score.toString().padStart(4, '0')}</span>
          <span className="hud-kill-label">ABATIDOS</span>
        </div>
      </div>
    </div>
  );
}


