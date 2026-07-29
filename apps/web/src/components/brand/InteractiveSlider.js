'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { TracerBorderCard } from '../ui/TracerBorderCard.js';
import { PillButton } from '../ui/PillButton.js';

/**
 * Creates 3D Kinetic DNA Double Helix for Slide 2 (Intenção Real / Sinais de Compra)
 * Both main helical strands (Strand 1 & Strand 2) are Electric Purple (#A855F7),
 * and the center base pair rungs (os meios) are individually multi-colored in a vibrant spectrum palette!
 */
function create3DDNAHelixGroup() {
  const dnaGroup = new THREE.Group();

  const numTurns = 3.5;
  const totalAngle = numTurns * Math.PI * 2;
  const radius = 28;
  const totalHeight = 160;
  const numPoints = 140;
  const numRungs = 32;

  // 1. Generate Parametric Points for Strand 1 & Strand 2 (Shifted 180° / PI)
  const pointsStrand1 = [];
  const pointsStrand2 = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const angle = t * totalAngle;
    const y = (t - 0.5) * totalHeight;

    const x1 = Math.cos(angle) * radius;
    const z1 = Math.sin(angle) * radius;

    const x2 = Math.cos(angle + Math.PI) * radius;
    const z2 = Math.sin(angle + Math.PI) * radius;

    pointsStrand1.push(new THREE.Vector3(x1, y, z1));
    pointsStrand2.push(new THREE.Vector3(x2, y, z2));
  }

  // 2. Create Continuous Smooth Curves & 3D Tubes
  const curve1 = new THREE.CatmullRomCurve3(pointsStrand1);
  const curve2 = new THREE.CatmullRomCurve3(pointsStrand2);

  const tubeGeo1 = new THREE.TubeGeometry(curve1, 120, 3.5, 16, false);
  const tubeGeo2 = new THREE.TubeGeometry(curve2, 120, 3.5, 16, false);

  // Both Main Strands: Electric Purple (#A855F7)
  const purpleMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7, // High-Tech Electric Purple
    metalness: 0.85,
    roughness: 0.15,
    emissive: new THREE.Color(0x9333ea),
    emissiveIntensity: 0.65,
  });

  const tube1 = new THREE.Mesh(tubeGeo1, purpleMat);
  const tube2 = new THREE.Mesh(tubeGeo2, purpleMat);

  dnaGroup.add(tube1);
  dnaGroup.add(tube2);

  // 3. Center Rungs (Os Meios): Multi-colored spectrum (Blue, Gold, Green, Pink, Cyan, Orange, Violet)
  const rungsGroup = new THREE.Group();
  const sphereGeo = new THREE.SphereGeometry(4.2, 16, 16);

  const rungPalette = [
    0x00e5ff, // Electric Blue
    0xffd400, // Golden Yellow
    0x25d366, // Emerald Green
    0xff3366, // Hot Coral Pink
    0x00f0ff, // Neon Cyan
    0xff7700, // Bright Orange
    0x8b5cf6, // Deep Violet
  ];

  for (let i = 0; i <= numRungs; i++) {
    const t = i / numRungs;
    const p1 = curve1.getPoint(t);
    const p2 = curve2.getPoint(t);

    // Glowing Node at Strand 1 (Purple)
    const node1 = new THREE.Mesh(sphereGeo, purpleMat);
    node1.position.copy(p1);
    dnaGroup.add(node1);

    // Glowing Node at Strand 2 (Purple)
    const node2 = new THREE.Mesh(sphereGeo, purpleMat);
    node2.position.copy(p2);
    dnaGroup.add(node2);

    // Multi-colored Rung (Os Meios Cada Um de Uma Cor)
    const colorHex = rungPalette[i % rungPalette.length];
    const rungMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: 0.8,
      roughness: 0.2,
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: 0.75,
    });

    const distance = p1.distanceTo(p2);
    const rungGeo = new THREE.CylinderGeometry(1.5, 1.5, distance, 12);
    const rung = new THREE.Mesh(rungGeo, rungMat);

    const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    rung.position.copy(midpoint);
    rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(p2, p1).normalize());

    rungsGroup.add(rung);
  }

  dnaGroup.add(rungsGroup);
  dnaGroup.position.set(75, 0, 0);
  dnaGroup.rotation.z = Math.PI / 6.5; // ~28 degree tilt

  return { dnaGroup, rungsGroup };
}

/**
 * Creates 3D Extruded WhatsApp elements in WhatsApp Emerald Green (#25D366)
 * - Outer Speech Bubble: Dark glass body with WhatsApp Emerald Green (#25D366) border glow.
 * - Inner Phone Receiver: Fixed, STATIONARY & UPRIGHT in pure white/gold.
 */
function createWhatsApp3DGroup() {
  const zapGroup = new THREE.Group();

  const bubblePathStr = "M307.546 52.566C273.709 18.684 228.706.017 180.756 0 81.951 0 1.538 80.404 1.504 179.235c-.017 31.594 8.242 62.432 23.928 89.609L0 361.736l95.024-24.925c26.179 14.285 55.659 21.805 85.655 21.814h.077c98.788 0 179.21-80.413 179.244-179.244.017-47.898-18.608-92.926-52.454-126.807v-.008Zm-126.79 275.788h-.06c-26.73-.008-52.952-7.194-75.831-20.765l-5.44-3.231-56.391 14.791 15.05-54.981-3.542-5.638c-14.912-23.721-22.793-51.139-22.776-79.286.035-82.14 66.867-148.973 149.051-148.973 39.793.017 77.198 15.53 105.328 43.695 28.131 28.157 43.61 65.596 43.593 105.398-.035 82.149-66.867 148.982-148.982 148.982v.008Z";

  const phonePathStr = "M262.475 216.777c-4.478-2.243-26.497-13.073-30.606-14.568-4.108-1.496-7.09-2.243-10.073 2.243-2.982 4.487-11.568 14.577-14.181 17.559-2.613 2.991-5.226 3.361-9.704 1.117-4.477-2.243-18.908-6.97-36.02-22.226-13.313-11.878-22.304-26.54-24.916-31.027-2.613-4.486-.275-6.91 1.959-9.136 2.011-2.011 4.478-5.234 6.721-7.847 2.244-2.613 2.983-4.486 4.478-7.469 1.496-2.991.748-5.603-.369-7.847-1.118-2.243-10.073-24.289-13.812-33.253-3.636-8.732-7.331-7.546-10.073-7.692-2.613-.13-5.595-.155-8.586-.155-2.991 0-7.839 1.118-11.947 5.604-4.108 4.486-15.677 15.324-15.677 37.361s16.047 43.344 18.29 46.335c2.243 2.991 31.585 48.225 76.51 67.632 10.684 4.615 19.029 7.374 25.535 9.437 10.727 3.412 20.49 2.931 28.208 1.779 8.604-1.289 26.498-10.838 30.228-21.298 3.73-10.46 3.73-19.433 2.613-21.298-1.117-1.865-4.108-2.991-8.586-5.234l.008-.017Z";

  const loader = new SVGLoader();

  // 1. Outer Speech Bubble 3D Mesh in WhatsApp Emerald Green (#25D366)
  const bubbleParsed = loader.parse(`<svg><path d="${bubblePathStr}"/></svg>`);
  const bubbleShapes = SVGLoader.createShapes(bubbleParsed.paths[0]);
  const bubbleGeo = new THREE.ExtrudeGeometry(bubbleShapes, {
    depth: 14,
    bevelEnabled: true,
    bevelThickness: 3,
    bevelSize: 3,
    bevelSegments: 4,
  });
  bubbleGeo.center();
  bubbleGeo.scale(0.24, -0.24, 0.24);

  const bubbleMat = new THREE.MeshStandardMaterial({
    color: 0x0f2918, // Dark green glass body
    roughness: 0.2,
    metalness: 0.8,
    emissive: new THREE.Color(0x25d366), // WhatsApp Emerald Green Glow
    emissiveIntensity: 0.45,
  });
  const bubbleMesh = new THREE.Mesh(bubbleGeo, bubbleMat);

  // Outer Emerald Green Ring Accent
  const ringGeo = new THREE.TorusGeometry(44, 2, 16, 64);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x25d366, // WhatsApp Green
    metalness: 0.9,
    roughness: 0.1,
    emissive: new THREE.Color(0x25d366),
    emissiveIntensity: 0.6,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  bubbleMesh.add(ringMesh);

  // 2. Inner Phone Receiver 3D Mesh (STATIONARY & UPRIGHT)
  const phoneParsed = loader.parse(`<svg><path d="${phonePathStr}"/></svg>`);
  const phoneShapes = SVGLoader.createShapes(phoneParsed.paths[0]);
  const phoneGeo = new THREE.ExtrudeGeometry(phoneShapes, {
    depth: 18,
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 2,
    bevelSegments: 4,
  });
  phoneGeo.center();
  phoneGeo.scale(0.24, -0.24, 0.24);

  const phoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.1,
    metalness: 0.9,
    emissive: new THREE.Color(0x25d366),
    emissiveIntensity: 0.25,
  });
  const phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);

  zapGroup.add(bubbleMesh);
  zapGroup.add(phoneMesh);
  zapGroup.position.set(75, 0, 0);

  return { zapGroup, bubbleMesh, phoneMesh };
}

/**
 * ThreeBackgroundCanvas - 3D WebGL Scene Component
 */
function ThreeBackgroundCanvas({ activeIndex }) {
  const mountRef = useRef(null);
  const slideGroupRef = useRef(null);
  const dnaGroupRef = useRef(null);
  const dnaRungsRef = useRef(null);
  const blueDataParticlesRef = useRef(null);
  const blueVelocitiesRef = useRef([]);
  const bubbleMeshRef = useRef(null);
  const phoneMeshRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, Renderer setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 200);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 2. Lighting System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const goldPointLight = new THREE.PointLight(0xffd400, 4.5, 500);
    goldPointLight.position.set(160, 120, 140);
    scene.add(goldPointLight);

    // 3. Floating 3D Particle Constellation (Base)
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorGold = new THREE.Color(0xffd400);
    const colorWhite = new THREE.Color(0xfafaf7);
    const colorGrey = new THREE.Color(0x71717a);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 650;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 450;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

      const rand = Math.random();
      const c = rand > 0.6 ? colorGold : rand > 0.3 ? colorWhite : colorGrey;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // 4. Slide Specific 3D Geometries Group
    const slideGroup = new THREE.Group();
    slideGroupRef.current = slideGroup;
    scene.add(slideGroup);

    // === SLIDE 0: PURE 3D HOLOGRAPHIC VECTOR GLOBE (MÓDULO 01 - DOSSIÊ ICP) ===
    const earthGroup = new THREE.Group();
    earthGroup.position.set(75, 0, 0);

    const holoGeo = new THREE.SphereGeometry(48, 32, 32);
    const holoMat = new THREE.MeshBasicMaterial({
      color: 0xffd400,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const holoMesh = new THREE.Mesh(holoGeo, holoMat);
    earthGroup.add(holoMesh);

    const atmosGeo = new THREE.SphereGeometry(54, 20, 20);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0xffd400,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    earthGroup.add(atmosMesh);

    slideGroup.add(earthGroup);

    // === SLIDE 1: 3D ANIMATED KINETIC DNA DOUBLE HELIX (MÓDULO 02 - INTENÇÃO REAL) ===
    const { dnaGroup, rungsGroup } = create3DDNAHelixGroup();
    dnaGroupRef.current = dnaGroup;
    dnaRungsRef.current = rungsGroup;
    slideGroup.add(dnaGroup);

    // === SLIDE 2: 3D ELECTRIC BLUE TERRAIN MESH + LOCALIZED DATA FOUNTAIN PARTICLES (MÓDULO 03 - MAPEAMENTO) ===
    const gridGroup = new THREE.Group();
    gridGroup.position.set(75, 0, 0);

    // Electric Blue Grid (#00E5FF)
    const gridGeo = new THREE.PlaneGeometry(240, 240, 20, 20);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, // High-Tech Electric Blue
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    gridMesh.rotation.x = -Math.PI / 2.5;
    gridGroup.add(gridMesh);

    // Dedicated Localized Blue Data Particles Fountain (Emanating strictly from 3D grid surface)
    const blueCount = 240;
    const blueGeo = new THREE.BufferGeometry();
    const bluePositions = new Float32Array(blueCount * 3);
    const blueVelocities = new Float32Array(blueCount);

    for (let i = 0; i < blueCount; i++) {
      bluePositions[i * 3] = (Math.random() - 0.5) * 140; // x bounded on grid
      bluePositions[i * 3 + 1] = -25 + Math.random() * 85; // y height above grid
      bluePositions[i * 3 + 2] = (Math.random() - 0.5) * 140; // z bounded on grid
      blueVelocities[i] = 0.5 + Math.random() * 0.7;
    }

    blueVelocitiesRef.current = blueVelocities;
    blueGeo.setAttribute('position', new THREE.BufferAttribute(bluePositions, 3));

    const blueMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 3.2,
      transparent: true,
      opacity: 0.9,
    });

    const blueParticles = new THREE.Points(blueGeo, blueMat);
    blueDataParticlesRef.current = blueParticles;
    gridGroup.add(blueParticles);

    slideGroup.add(gridGroup);

    // === SLIDE 3: 3D WHATSAPP IN EMERALD GREEN (MÓDULO 04 - INTEGRAÇÃO ZAP) ===
    const { zapGroup, bubbleMesh, phoneMesh } = createWhatsApp3DGroup();
    bubbleMeshRef.current = bubbleMesh;
    phoneMeshRef.current = phoneMesh;
    slideGroup.add(zapGroup);

    // 5. Animation Loop
    let animationFrameId;
    let mouseX = 0, mouseY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 16;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 16;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = Date.now() * 0.002;

      // Rotate particle constellation
      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0004;

      // Rotate 3D Holographic Globe (Slide 1)
      holoMesh.rotation.y += 0.005;
      atmosMesh.rotation.y -= 0.003;

      // Rotate 3D Kinetic DNA Double Helix Strand (Slide 2)
      if (dnaGroupRef.current) {
        dnaGroupRef.current.rotation.y += 0.016;
        
        if (dnaRungsRef.current) {
          dnaRungsRef.current.children.forEach((rung, idx) => {
            const waveOffset = idx * 0.25;
            const pulseScale = 1 + Math.sin(time * 2 + waveOffset) * 0.16;
            rung.scale.set(pulseScale, 1, pulseScale);
          });
        }
      }

      // Rotate 3D Blue Terrain Grid & Fountain Blue Data Particles (Slide 3)
      gridMesh.rotation.z += 0.003;
      if (blueDataParticlesRef.current && blueVelocitiesRef.current.length > 0) {
        const positions = blueDataParticlesRef.current.geometry.attributes.position.array;
        const vels = blueVelocitiesRef.current;
        for (let i = 0; i < blueCount; i++) {
          positions[i * 3 + 1] += vels[i]; // Fountain upward from grid surface
          if (positions[i * 3 + 1] > 65) {
            // Reset particle at grid surface base
            positions[i * 3] = (Math.random() - 0.5) * 140;
            positions[i * 3 + 1] = -25;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 140;
          }
        }
        blueDataParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // 3D WHATSAPP EMBLEM: STATIONARY & UPRIGHT (0 ROTATION ON ALL AXES)
      if (bubbleMeshRef.current) {
        bubbleMeshRef.current.rotation.x = 0;
        bubbleMeshRef.current.rotation.y = 0;
        bubbleMeshRef.current.rotation.z = 0;
      }
      if (phoneMeshRef.current) {
        phoneMeshRef.current.rotation.x = 0;
        phoneMeshRef.current.rotation.y = 0;
        phoneMeshRef.current.rotation.z = 0;
      }

      // Smooth Parallax Camera
      camera.position.x += (mouseX - camera.position.x) * 0.04;
      camera.position.y += (-mouseY - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Morph visibility of slide objects based on activeIndex
  useEffect(() => {
    if (!slideGroupRef.current) return;
    const children = slideGroupRef.current.children;
    children.forEach((child, i) => {
      child.visible = i === activeIndex;
    });
  }, [activeIndex]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

const SLIDES = [
  {
    id: 'b2b-intel',
    step: 1,
    title: 'Inteligência B2B',
    description: 'Acesse contatos validados, e-mails diretos e inteligência acionável dos decisores chave do seu ICP ideal.',
    cardLabel: 'Módulo 01',
    cardTitle: 'Dossiê ICP',
    buttonText: 'VER DOSSIÊ',
    strokeColor: '#FFD400', // Signature Golden Yellow
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <line x1="12" y1="4" x2="12" y2="20" />
        <line x1="4" y1="12" x2="20" y2="12" />
      </svg>
    ),
  },
  {
    id: 'intent-signals',
    step: 2,
    title: 'Sinais de Compra',
    description: 'Monitore alertas em tempo real e saiba exatamente quando suas contas-alvo estão prontas para contratar.',
    cardLabel: 'Módulo 02',
    cardTitle: 'Intenção Real',
    buttonText: 'RASTREAR SINAIS',
    strokeColor: '#A855F7', // High-Tech Electric Purple
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 15c6.667-6 13.333 6 20 0" />
        <path d="M2 9c6.667 6 13.333-6 20 0" />
        <path d="M6 11.5v1M12 9.5v5M18 11.5v1" />
      </svg>
    ),
  },
  {
    id: 'market-mapping',
    step: 3,
    title: 'Filtros 360°',
    description: 'Mapeie o mercado nacional por faturamento, porte, CNAE principal, localização e tecnologia instalada.',
    cardLabel: 'Módulo 03',
    cardTitle: 'Mapeamento',
    buttonText: 'FILTRAR MERCADO',
    strokeColor: '#00E5FF', // High-Tech Electric Blue
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00E5FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </svg>
    ),
  },
  {
    id: 'crm-sync',
    step: 4,
    title: 'Automação CRM',
    description: 'Sincronize leads instantaneamente com seu pipeline de vendas e inicie abordagens via WhatsApp wa.me.',
    cardLabel: 'Módulo 04',
    cardTitle: 'Integração Zap',
    buttonText: 'CONECTAR CRM',
    strokeColor: '#25D366', // WhatsApp Emerald Green
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6" />
        <path d="M2 11.5a10 10 0 0 1-18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16" />
      </svg>
    ),
  },
];

export function InteractiveSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const activeSlide = SLIDES[activeIndex];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % SLIDES.length);
  };

  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        handleNext();
      }, 5500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, activeIndex]);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        zIndex: 1,
        background: '#07070A',
      }}
      className="elementor-interactive-slider"
    >
      {/* Dynamic 3D WebGL Background Canvas */}
      <ThreeBackgroundCanvas activeIndex={activeIndex} />

      {/* LEFT TIMELINE STEP DOTS */}
      <div
        style={{
          position: 'absolute',
          left: '48px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        {SLIDES.map((slide, idx) => {
          const isActive = idx === activeIndex;
          const dotColor = slide.strokeColor;
          return (
            <div
              key={slide.id}
              onClick={() => setActiveIndex(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              {isActive ? (
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: dotColor,
                    color: '#07070A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 800,
                    boxShadow: `0 0 16px ${dotColor}`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {slide.step}
                </div>
              ) : (
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.35)',
                    transition: 'all 0.3s ease',
                  }}
                />
              )}

              {idx < SLIDES.length - 1 && (
                <div
                  style={{
                    width: 1,
                    height: 28,
                    background: isActive ? dotColor : 'rgba(255, 255, 255, 0.15)',
                    marginTop: 6,
                    marginBottom: 6,
                    transition: 'background 0.3s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* LEFT HERO MAIN CONTENT */}
      <div
        key={`hero-${activeSlide.id}`}
        style={{
          position: 'absolute',
          left: '96px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          maxWidth: 380,
          animation: 'elementorFadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.12,
            color: 'var(--text-primary, #FAFAF7)',
            margin: '0 0 16px 0',
          }}
        >
          {activeSlide.title}
        </h1>
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: 'var(--text-secondary, #9A9A92)',
            margin: '0 0 28px 0',
          }}
        >
          {activeSlide.description}
        </p>

        {/* Standardized UI Pill Button */}
        <PillButton variant="primary">
          {activeSlide.buttonText}
        </PillButton>
      </div>

      {/* RIGHT CAROUSEL (MODULAR TRACER BORDER THUMBNAIL CARDS MATCHING MODULE STROKE COLORS) */}
      <div
        style={{
          position: 'absolute',
          right: '36px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 5,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        {SLIDES.map((slide, idx) => {
          const isActive = idx === activeIndex;
          const cardStroke = slide.strokeColor;
          return (
            <TracerBorderCard
              key={slide.id}
              active={isActive}
              onClick={() => setActiveIndex(idx)}
              strokeColor={cardStroke}
              width={160}
              height={230}
            >
              {/* Top Vector Icon */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: isActive ? `${cardStroke}1E` : 'rgba(255, 255, 255, 0.05)',
                  border: isActive ? `1px solid ${cardStroke}66` : '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}
              >
                {slide.icon}
              </div>

              {/* Bottom Card Labels */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-tertiary, #9A9A92)',
                    fontWeight: 500,
                  }}
                >
                  {slide.cardLabel}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--text-primary, #FAFAF7)',
                    lineHeight: 1.2,
                  }}
                >
                  {slide.cardTitle}
                </span>
              </div>
            </TracerBorderCard>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes elementorFadeIn {
          from {
            opacity: 0;
            transform: translateY(-48%) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
