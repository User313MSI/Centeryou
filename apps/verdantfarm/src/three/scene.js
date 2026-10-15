import * as THREE from 'three';
import { Renderer, TextureLoader } from 'expo-three';
import { GLView } from 'expo-gl';
import { CROPS, ANIMALS } from '../game';

export function createFarmScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xa8d4e8, 30, 120);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
  camera.position.set(0, 14, 20);
  camera.lookAt(0, 0, 0);

  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x6b8f5a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
  sun.position.set(18, 26, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const sunTarget = sun.target;
  scene.add(sunTarget);

  const world = new THREE.Group();
  scene.add(world);

  // --- Terrain: rolling island ---
  const groundGeo = new THREE.PlaneGeometry(64, 64, 48, 48);
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const edge = Math.max(Math.abs(x), Math.abs(y));
    let z = Math.sin(x * 0.22) * Math.cos(y * 0.18) * 0.5;
    if (edge > 24) z -= (edge - 24) * 1.2; // island falls off
    pos.setZ(i, z);
  }
  groundGeo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x69a85a, roughness: 0.95 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  world.add(ground);

  // water ring around island
  const waterGeo = new THREE.PlaneGeometry(200, 200);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2f7fd0, roughness: 0.2, transparent: true, opacity: 0.85 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -2.4;
  world.add(water);

  // --- Trees (low-poly) ---
  const trees = [];
  const treeSpots = [
    [-22, -14], [24, 16], [-26, 8], [20, -20], [-14, 24], [27, 2], [-27, -4], [8, 27], [-6, -27],
  ];
  for (const [tx, tz] of treeSpots) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 1.4, 6),
      new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 1 })
    );
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    g.add(trunk);
    const leafGeo = new THREE.IcosahedronGeometry(1.15, 0);
    const leaf = new THREE.Mesh(leafGeo, new THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 0.9, flatShading: true }));
    leaf.position.y = 1.9;
    leaf.scale.y = 1.25;
    leaf.castShadow = true;
    g.add(leaf);
    g.position.set(tx, 0, tz);
    const s = 0.8 + Math.random() * 0.6;
    g.scale.setScalar(s);
    world.add(g);
    trees.push(g);
  }

  // --- Farm plots (3D tilled soil + fence) ---
  const plotMeshes = [];
  const plotPlants = [];
  const PLOT_SIZE = 4.4;
  const plotsOrigin = { x: -13.2, z: -4.4 };
  const perRow = 4;
  const rowGap = 5.6;

  function makePlotMesh(index) {
    const gx = plotsOrigin.x + (index % perRow) * rowGap;
    const gz = plotsOrigin.z + Math.floor(index / perRow) * rowGap;
    const g = new THREE.Group();

    const soil = new THREE.Mesh(
      new THREE.BoxGeometry(PLOT_SIZE, 0.5, PLOT_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 })
    );
    soil.position.y = 0.2;
    soil.receiveShadow = true;
    g.add(soil);

    // furrows
    for (let f = 0; f < 3; f++) {
      const furrow = new THREE.Mesh(
        new THREE.BoxGeometry(PLOT_SIZE - 0.6, 0.06, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x54371f, roughness: 1 })
      );
      furrow.position.set(0, 0.47, -1.2 + f * 1.2);
      g.add(furrow);
    }

    // fence posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x9a7845, roughness: 1 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xb08d55, roughness: 1 });
    const h = PLOT_SIZE / 2;
    const corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
    corners.forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 5), postMat);
      post.position.set(px, 0.5, pz);
      post.castShadow = true;
      g.add(post);
    });
    const rails = [
      { x: 0, z: -h, w: PLOT_SIZE, d: 0.05 },
      { x: 0, z: h, w: PLOT_SIZE, d: 0.05 },
      { x: -h, z: 0, w: 0.05, d: PLOT_SIZE },
      { x: h, z: 0, w: 0.05, d: PLOT_SIZE },
    ];
    rails.forEach(({ x, z, w, d }) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), railMat);
      rail.position.set(x, 0.62, z);
      g.add(rail);
    });

    g.position.set(gx, 0, gz);
    world.add(g);

    const plants = new THREE.Group();
    plants.position.set(gx, 0.45, gz);
    world.add(plants);
    plotPlants.push(plants);
    plotMeshes.push(g);
    return g;
  }

  // --- Crop plant 3D models per type ---
  function plantModel3D(cropId, progress, ready) {
    const crop = CROPS[cropId];
    const g = new THREE.Group();
    const h = 0.25 + progress * 0.9;

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4a8f3d, roughness: 0.9, flatShading: true });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, h, 5), leafMat);
    stem.position.y = h / 2;
    stem.castShadow = true;
    g.add(stem);

    if (crop.emoji === '🥕') {
      for (let i = 0; i < 3; i++) {
        const leafBlade = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 4), leafMat);
        leafBlade.position.set((Math.random() - 0.5) * 0.18, h + 0.12, (Math.random() - 0.5) * 0.18);
        leafBlade.rotation.z = (Math.random() - 0.5) * 0.7;
        g.add(leafBlade);
      }
    } else if (crop.emoji === '🍅') {
      const leafBall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0), leafMat);
      leafBall.position.y = h;
      g.add(leafBall);
      if (ready) {
        const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xd6342c, roughness: 0.5 });
        for (let i = 0; i < 3; i++) {
          const t = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), tomatoMat);
          const a = (i / 3) * Math.PI * 2;
          t.position.set(Math.cos(a) * 0.22, h - 0.08, Math.sin(a) * 0.22);
          g.add(t);
        }
      }
    } else if (crop.emoji === '🌽') {
      for (let i = 0; i < 4; i++) {
        const leafBlade = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 4), leafMat);
        const a = (i / 4) * Math.PI * 2;
        leafBlade.position.set(Math.cos(a) * 0.14, h * 0.7, Math.sin(a) * 0.14);
        leafBlade.rotation.z = Math.cos(a) * 0.5;
        leafBlade.rotation.x = Math.sin(a) * 0.5;
        g.add(leafBlade);
      }
      if (ready) {
        const cobMat = new THREE.MeshStandardMaterial({ color: 0xf0c230, roughness: 0.7 });
        const cob = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.42, 6), cobMat);
        cob.position.y = h * 0.8;
        g.add(cob);
      }
    } else if (crop.emoji === '🎃') {
      const pumpkinMat = new THREE.MeshStandardMaterial({ color: ready ? 0xe07020 : 0x8fae4a, roughness: 0.8 });
      const pumpkin = new THREE.Mesh(new THREE.SphereGeometry(0.32 * (0.4 + progress * 0.6), 10, 8), pumpkinMat);
      pumpkin.scale.y = 0.75;
      pumpkin.position.y = 0.32 * (0.4 + progress * 0.6);
      pumpkin.castShadow = true;
      g.add(pumpkin);
    } else if (crop.emoji === '🍓' || crop.emoji === '🌙') {
      const leafBall = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), leafMat);
      leafBall.position.y = h * 0.9;
      g.add(leafBall);
      if (ready) {
        const berryMat = new THREE.MeshStandardMaterial({
          color: crop.emoji === '🌙' ? 0xdfe8ff : 0xe84050,
          emissive: crop.emoji === '🌙' ? 0x8090ff : 0x000000,
          roughness: 0.4,
        });
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), berryMat);
          const a = (i / 4) * Math.PI * 2;
          b.position.set(Math.cos(a) * 0.26, h * 0.75, Math.sin(a) * 0.26);
          g.add(b);
        }
      }
    } else {
      // wheat-like: golden head
      const headMat = new THREE.MeshStandardMaterial({
        color: ready ? 0xe8c85a : 0x7aae4f,
        roughness: 0.8,
        flatShading: true,
      });
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 5), headMat);
      head.position.y = h + 0.18;
      g.add(head);
      if (progress > 0.3) {
        for (let i = 0; i < 2; i++) {
          const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 4), leafMat);
          blade.position.set((i - 0.5) * 0.16, h * 0.55, 0);
          blade.rotation.z = (i - 0.5) * 0.6;
          g.add(blade);
        }
      }
    }
    return g;
  }

  function updatePlotPlants(plots) {
    for (let i = 0; i < plotPlants.length; i++) {
      const holder = plotPlants[i];
      const plot = plots[i];
      if (!plot) continue;
      while (holder.children.length) holder.remove(holder.children[0]);
      if (!plot.crop) continue;
      const positions = [
        [-1.4, -1.4], [0, -1.4], [1.4, -1.4],
        [-1.4, 0], [0, 0], [1.4, 0],
        [-1.4, 1.4], [0, 1.4], [1.4, 1.4],
      ];
      for (const [px, pz] of positions) {
        const plant = plantModel3D(plot.crop, Math.min(1, plot.growProgress || 0), plot.ready);
        plant.position.set(px, 0, pz);
        holder.add(plant);
      }
    }
  }

  // --- Animals (low-poly, wandering) ---
  const animalGroup = new THREE.Group();
  world.add(animalGroup);

  function makeChicken() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.8 }));
    body.scale.set(1.15, 0.95, 0.9);
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), body.material);
    head.position.set(0.3, 0.85, 0);
    g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 4), new THREE.MeshStandardMaterial({ color: 0xe8a030 }));
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.5, 0.85, 0);
    g.add(beak);
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.1), new THREE.MeshStandardMaterial({ color: 0xd03030 }));
    comb.position.set(0.3, 1.02, 0);
    g.add(comb);
    for (const lx of [-0.12, 0.12]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25, 4), new THREE.MeshStandardMaterial({ color: 0xe8a030 }));
      leg.position.set(lx, 0.12, 0);
      g.add(leg);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), body.material);
    tail.rotation.z = Math.PI / 3;
    tail.position.set(-0.38, 0.62, 0);
    g.add(tail);
    return g;
  }

  function makeCow() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.85 });
    const spotMat = new THREE.MeshStandardMaterial({ color: 0x3a2e26, roughness: 0.85 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), bodyMat);
    body.scale.set(1.3, 0.85, 0.85);
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), spotMat);
    spot.scale.set(1.3, 0.55, 0.9);
    spot.position.set(0.1, 1.1, 0.2);
    g.add(spot);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.4), bodyMat);
    head.position.set(0.85, 1.15, 0);
    g.add(head);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.34), new THREE.MeshStandardMaterial({ color: 0xd8a8a0 }));
    muzzle.position.set(1.08, 1.05, 0);
    g.add(muzzle);
    for (const hx of [-0.14, 0.14]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 5), new THREE.MeshStandardMaterial({ color: 0xc8c0b0 }));
      horn.position.set(0.82, 1.42, hx);
      g.add(horn);
    }
    for (const [lx, lz] of [[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.6, 5), bodyMat);
      leg.position.set(lx, 0.3, lz);
      leg.castShadow = true;
      g.add(leg);
    }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4), bodyMat);
    tail.position.set(-0.78, 1.15, 0);
    tail.rotation.z = 0.35;
    g.add(tail);
    return g;
  }

  function makeSheep() {
    const g = new THREE.Group();
    const woolMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 1 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 7), woolMat);
    body.scale.set(1.15, 0.95, 0.95);
    body.position.y = 0.8;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.26), new THREE.MeshStandardMaterial({ color: 0x4a4038 }));
    head.position.set(0.62, 0.95, 0);
    g.add(head);
    for (const [lx, lz] of [[-0.28, -0.22], [0.28, -0.22], [-0.28, 0.22], [0.28, 0.22]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 4), new THREE.MeshStandardMaterial({ color: 0x4a4038 }));
      leg.position.set(lx, 0.21, lz);
      g.add(leg);
    }
    return g;
  }

  function makeGoat() {
    const g = makeSheep();
    g.children[0].material = new THREE.MeshStandardMaterial({ color: 0xd8cfc0, roughness: 1 });
    const horns = new THREE.Group();
    for (const hz of [-0.1, 0.1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0xa89880 }));
      horn.rotation.z = -0.5;
      horn.position.set(0.58, 1.18, hz);
      horns.add(horn);
    }
    g.add(horns);
    return g;
  }

  function makeBeehive() {
    const g = new THREE.Group();
    const hive = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.36, 0.9, 7),
      new THREE.MeshStandardMaterial({ color: 0xd8a850, roughness: 0.9 })
    );
    hive.position.y = 0.45;
    hive.castShadow = true;
    g.add(hive);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.3, 7), new THREE.MeshStandardMaterial({ color: 0x8a6430 }));
    cap.position.y = 1.02;
    g.add(cap);
    return g;
  }

  function makeAlpaca() {
    const g = makeSheep();
    g.scale.set(1.3, 1.25, 1.3);
    g.children[0].material = new THREE.MeshStandardMaterial({ color: 0xe8ddd0, roughness: 1 });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6), g.children[0].material);
    neck.position.set(0.55, 1.3, 0);
    neck.rotation.z = 0.4;
    g.add(neck);
    return g;
  }

  const animalFactories = { hen: makeChicken, cow: makeCow, sheep: makeSheep, goat: makeGoat, bees: makeBeehive, alpaca: makeAlpaca };
  const animalAgents = [];

  function spawnAnimal(animalId) {
    const factory = animalFactories[animalId];
    if (!factory) return null;
    const mesh = factory();
    const agent = {
      mesh,
      animalId,
      targetX: (Math.random() - 0.5) * 30,
      targetZ: 10 + Math.random() * 12,
      speed: 0.6 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    };
    mesh.position.set(agent.targetX, 0, agent.targetZ);
    animalGroup.add(mesh);
    animalAgents.push(agent);
    return agent;
  }

  function syncAnimals(animals) {
    const desired = {};
    for (const a of animals) desired[a.id] = (desired[a.id] || 0) + 1;
    for (const [agentId, count] of Object.entries(desired)) {
      const have = animalAgents.filter((a) => a.animalId === agentId).length;
      for (let i = have; i < count; i++) spawnAnimal(agentId);
    }
  }

  function updateAnimals(dt, t) {
    for (const agent of animalAgents) {
      if (agent.animalId === 'bees') {
        agent.mesh.rotation.y = t * 0.3;
        continue;
      }
      const dx = agent.targetX - agent.mesh.position.x;
      const dz = agent.targetZ - agent.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) {
        agent.targetX = (Math.random() - 0.5) * 28;
        agent.targetZ = 8 + Math.random() * 14;
      } else {
        const vx = (dx / dist) * agent.speed * dt;
        const vz = (dz / dist) * agent.speed * dt;
        agent.mesh.position.x += vx;
        agent.mesh.position.z += vz;
        agent.mesh.rotation.y = Math.atan2(dx, dz);
        agent.mesh.position.y = Math.abs(Math.sin(t * agent.speed * 4 + agent.phase)) * 0.06;
      }
    }
  }

  // --- Weather: rain particles ---
  const rainCount = 400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPos[i * 3] = (Math.random() - 0.5) * 60;
    rainPos[i * 3 + 1] = Math.random() * 20;
    rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(
    rainGeo,
    new THREE.PointsMaterial({ color: 0x9fc8e8, size: 0.12, transparent: true, opacity: 0.7 })
  );
  rain.visible = false;
  world.add(rain);

  function updateRain(dt, active) {
    rain.visible = active;
    if (!active) return;
    const arr = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
      arr[i * 3 + 1] -= dt * 18;
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 20;
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }

  // --- Day/night ---
  function updateDayNight(time) {
    const hour = (time / 3600) % 24;
    const dayness = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI));
    const skyDay = new THREE.Color(0x87c5e8);
    const skyNight = new THREE.Color(0x101830);
    const sky = skyNight.clone().lerp(skyDay, dayness);
    scene.background = sky;
    scene.fog.color.copy(sky);
    sun.intensity = 0.25 + dayness * 1.5;
    sun.position.set(18, 6 + dayness * 22, 10);
    hemi.intensity = 0.35 + dayness * 0.8;
  }

  // --- Ready markers (floating icon) ---
  const readySprites = [];
  const canvasIcon = {};
  function iconTexture(emoji) {
    if (canvasIcon[emoji]) return canvasIcon[emoji];
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 32, 34);
    const tex = new THREE.CanvasTexture(c);
    canvasIcon[emoji] = tex;
    return tex;
  }

  const markerGroup = new THREE.Group();
  world.add(markerGroup);

  function updateMarkers(plots) {
    while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
    plots.forEach((plot, i) => {
      if (!plot.ready) return;
      const mesh = plotMeshes[i];
      if (!mesh) return;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(CROPS[plot.crop].emoji), transparent: true }));
      sprite.scale.set(1.1, 1.1, 1);
      sprite.position.copy(mesh.position).add(new THREE.Vector3(0, 2.4, 0));
      markerGroup.add(sprite);
    });
  }

  function plotScreenPositions(plots) {
    return plotMeshes.map((m, i) => {
      const v = m.position.clone();
      v.y += 0.4;
      v.project(camera);
      return plots[i] ? { x: v.x, y: v.y, index: i } : null;
    });
  }

  return {
    scene, camera, world, sun,
    makePlotMesh, updatePlotPlants, syncAnimals, updateAnimals,
    updateRain, updateDayNight, updateMarkers, plotScreenPositions, plotMeshes,
  };
}
