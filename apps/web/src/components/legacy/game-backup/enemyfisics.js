'use client';

import * as THREE from 'three';

export class SpaceEnemy {
  constructor(type, xLimit, yLimit, geometries, materials) {
    this.type = type;
    this.originalMaterial = materials[type] || materials.rock;
    
    const geo = geometries[type] || geometries.rock;
    this.mesh = new THREE.Mesh(geo, this.originalMaterial.clone());

    const startX = (Math.random() - 0.5) * xLimit * 1.8;
    this.mesh.position.set(startX, yLimit + 5, (Math.random() - 0.5) * 4);

    if (type === 'suicide') {
      this.speed = Math.random() * 0.14 + 0.14;
      this.hp = 1;
      this.maxHp = 1;
      this.rotSpeed = 0.04;
    } else if (type === 'orb') {
      this.speed = Math.random() * 0.10 + 0.09;
      this.hp = 2;
      this.maxHp = 2;
      this.rotSpeed = 0.05;
      this.sinSeed = Math.random() * 100;
    } else {
      // rock / asteroid
      this.speed = Math.random() * 0.07 + 0.04;
      this.hp = 3;
      this.maxHp = 3;
      this.rotSpeed = Math.random() * 0.03 + 0.01;
    }

    this.flashTimer = 0;
  }

  takeDamage() {
    this.hp--;
    this.flashTimer = 0.08;
    if (this.mesh && this.mesh.material) {
      this.mesh.material.color.setHex(0xffffff);
    }
  }

  update(dt, playerX, yLimit, xLimit) {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0 && this.mesh && this.mesh.material) {
        this.mesh.material.color.copy(this.originalMaterial.color);
      }
    }

    if (this.type === 'suicide') {
      const dx = playerX - this.mesh.position.x;
      this.mesh.position.x += Math.sign(dx) * Math.min(Math.abs(dx), 0.07) * (dt * 60);
      this.mesh.position.y -= this.speed * (dt * 60);
      this.mesh.rotation.z += 0.05 * (dt * 60);
    } else if (this.type === 'orb') {
      this.sinSeed += dt * 3;
      this.mesh.position.x += Math.sin(this.sinSeed) * 0.12 * (dt * 60);
      this.mesh.position.y -= this.speed * (dt * 60);
      this.mesh.rotation.x += this.rotSpeed * (dt * 60);
      this.mesh.rotation.y += this.rotSpeed * (dt * 60);
    } else {
      this.mesh.position.y -= this.speed * (dt * 60);
      this.mesh.rotation.x += this.rotSpeed * (dt * 60);
      this.mesh.rotation.y += this.rotSpeed * 0.7 * (dt * 60);
    }

    if (this.mesh.position.y < -yLimit - 6) {
      this.mesh.position.set((Math.random() - 0.5) * xLimit * 1.8, yLimit + 5, (Math.random() - 0.5) * 4);
      this.hp = this.maxHp;
    }
  }

  dispose() {
    if (this.mesh && this.mesh.material) {
      this.mesh.material.dispose();
    }
  }
}

