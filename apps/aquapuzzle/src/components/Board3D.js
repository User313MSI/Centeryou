import React from 'react';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { GEM_TYPES, ROWS, COLS, FISH } from '../game';

const GEM_COLORS = [0x4fc3f7, 0xffca28, 0xef5350, 0xab47bc, 0x66bb6a, 0xffa726];
const CELL = 1.0;

export default function Board3D({ board, selected, ownedFish, coinsFlash, onCellTap, onFishTap }) {
  const glRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const gemsRef = React.useRef([]);
  const fishRef = React.useRef([]);
  const stateRef = React.useRef({ board, selected, ownedFish, onCellTap });
  stateRef.current = { board, selected, ownedFish, onCellTap };

  const onGLContextCreated = (gl) => {
    glRef.current = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x062038);
    scene.fog = new THREE.Fog(0x062038, 14, 40);

    const camera = new THREE.PerspectiveCamera(50, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
    camera.position.set(0, 8.5, 9.5);
    camera.lookAt(0, 0, 0.5);

    scene.add(new THREE.HemisphereLight(0x8fd4ff, 0x0a2a4a, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(4, 10, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4fa8ff, 0.8);
    rim.position.set(-6, 4, -4);
    scene.add(rim);

    // underwater floor + sand
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a3a52, roughness: 1 })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = -2.5;
    scene.add(sand);

    // board base slab
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(COLS * CELL + 0.6, 0.4, ROWS * CELL + 0.6),
      new THREE.MeshStandardMaterial({ color: 0x0d2f4a, roughness: 0.8 })
    );
    slab.position.set(0, -0.32, 0);
    scene.add(slab);

    // checkerboard cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(CELL * 0.96, 0.08, CELL * 0.96),
          new THREE.MeshStandardMaterial({
            color: (r + c) % 2 === 0 ? 0x11405f : 0x0e3350,
            roughness: 0.6,
          })
        );
        tile.position.set((c - (COLS - 1) / 2) * CELL, -0.12, (r - (ROWS - 1) / 2) * CELL);
        scene.add(tile);
      }
    }

    // gems
    const gemGeos = [
      new THREE.OctahedronGeometry(0.38, 0),
      new THREE.IcosahedronGeometry(0.36, 0),
      new THREE.DodecahedronGeometry(0.36, 0),
      new THREE.SphereGeometry(0.36, 6, 4),
      new THREE.OctahedronGeometry(0.38, 0),
      new THREE.IcosahedronGeometry(0.36, 0),
    ];
    const gemMeshes = [];
    for (let r = 0; r < ROWS; r++) {
      gemMeshes.push([]);
      for (let c = 0; c < COLS; c++) {
        const mesh = new THREE.Mesh(
          gemGeos[0],
          new THREE.MeshStandardMaterial({
            color: GEM_COLORS[0], roughness: 0.15, metalness: 0.3,
            flatShading: true, emissive: 0x000000,
          })
        );
        mesh.position.set(999, 999, 999);
        scene.add(mesh);
        gemMeshes[r].push(mesh);
      }
    }
    gemsRef.current = gemMeshes;

    // aquarium fish (3D cones/spheres) swimming around the board
    const fishGroup = new THREE.Group();
    scene.add(fishGroup);
    const fishAgents = [];
    const fishFactories = {
      guppy: () => makeFish(0xff9a3c, 0.5),
      tetra: () => makeFish(0x4fd6ff, 0.55),
      clownfish: () => makeFish(0xff7a3c, 0.7),
      angelfish: () => makeFish(0xe8d44d, 0.8),
      lionfish: () => makeFish(0xc04af0, 0.9),
      seahorse: () => makeFish(0x7cffb2, 0.8),
      turtle: () => makeTurtle(0x5ce07a),
      octopus: () => makeOctopus(0xe05c8a),
      shark: () => makeShark(0x8aa7ff),
      whale: () => makeWhale(0x6cc4ff),
    };
    fishRef.current = { fishGroup, fishAgents, fishFactories };

    // bubbles
    const bubbleCount = 60;
    const bubbleGeo = new THREE.BufferGeometry();
    const bubblePos = new Float32Array(bubbleCount * 3);
    for (let i = 0; i < bubbleCount; i++) {
      bubblePos[i * 3] = (Math.random() - 0.5) * 22;
      bubblePos[i * 3 + 1] = Math.random() * 10 - 2;
      bubblePos[i * 3 + 2] = (Math.random() - 0.5) * 22;
    }
    bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
    const bubbles = new THREE.Points(
      bubbleGeo,
      new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.14, transparent: true, opacity: 0.6 })
    );
    scene.add(bubbles);

    const raycaster = new THREE.Raycaster();

    const loop = () => {
      const s = stateRef.current;
      const t = performance.now() / 1000;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const mesh = gemsRef.current[r][c];
          const type = s.board[r][c];
          if (type === null || type === undefined) { mesh.visible = false; continue; }
          mesh.visible = true;
          mesh.geometry = gemGeos[type % gemGeos.length];
          mesh.material.color.setHex(GEM_COLORS[type % GEM_COLORS.length]);
          const isSel = s.selected && s.selected.r === r && s.selected.c === c;
          mesh.material.emissive.setHex(isSel ? 0x2a5a8a : 0x000000);
          const bob = Math.sin(t * 2.4 + r * 0.7 + c * 0.5) * 0.04;
          mesh.position.set(
            (c - (COLS - 1) / 2) * CELL,
            0.12 + (isSel ? 0.3 : 0) + bob,
            (r - (ROWS - 1) / 2) * CELL
          );
          mesh.rotation.y = t * 0.5 + r + c;
          const pop = isSel ? 1.25 : 1;
          mesh.scale.setScalar(pop);
        }
      }

      for (const agent of fishAgents) {
        agent.phase += 0.01 * agent.speed;
        const rx = 7 + agent.orbit * 2;
        agent.mesh.position.set(
          Math.cos(agent.phase) * rx,
          agent.y + Math.sin(agent.phase * 2.3) * 0.8,
          Math.sin(agent.phase) * rx * 0.55 - 3
        );
        agent.mesh.rotation.y = -agent.phase + Math.PI / 2 + Math.sin(agent.phase * 2.3) * 0.2;
        agent.mesh.rotation.z = Math.sin(agent.phase * 2.3) * 0.12;
      }

      const arr = bubbles.geometry.attributes.position.array;
      for (let i = 0; i < bubbleCount; i++) {
        arr[i * 3 + 1] += 0.02;
        if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = -2;
      }
      bubbles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
      gl.endFrameEXP();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    function makeFish(color, size) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, flatShading: true });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.3 * size, 8, 6), mat);
      body.scale.set(1.4, 0.9, 0.7);
      g.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18 * size, 0.3 * size, 4), mat);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.5 * size;
      g.add(tail);
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.1 * size, 0.2 * size, 4), mat);
      fin.position.set(0, 0.2 * size, 0);
      g.add(fin);
      return g;
    }
    function makeTurtle(color) {
      const g = makeFish(color, 1.6);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 7), new THREE.MeshStandardMaterial({ color: 0x2e6b3a, roughness: 0.8 }));
      shell.scale.y = 0.55;
      shell.position.y = 0.12;
      g.add(shell);
      return g;
    }
    function makeOctopus(color) {
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
      head.scale.y = 1.2;
      g.add(head);
      for (let i = 0; i < 6; i++) {
        const arm = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 5), head.material);
        const a = (i / 6) * Math.PI * 2;
        arm.position.set(Math.cos(a) * 0.2, -0.4, Math.sin(a) * 0.2);
        arm.rotation.x = Math.PI;
        g.add(arm);
      }
      return g;
    }
    function makeShark(color) {
      const g = makeFish(color, 2);
      const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 4), g.children[0].material);
      dorsal.position.set(0, 0.5, 0);
      g.add(dorsal);
      return g;
    }
    function makeWhale(color) {
      const g = makeFish(color, 3.4);
      return g;
    }
  };

  React.useEffect(() => {
    // sync owned fish
    const fr = fishRef.current;
    if (!fr) return;
    const { fishGroup, fishAgents, fishFactories } = fr;
    const ownedIds = stateRef.current.ownedFish || ['guppy'];
    const current = {};
    for (const a of fishAgents) current[a.id] = (current[a.id] || 0) + 1;
    for (const id of ownedIds) {
      const want = 1;
      const have = current[id] || 0;
      for (let i = have; i < want; i++) {
        const factory = fishFactories[id] || fishFactories.guppy;
        const mesh = factory();
        const agent = {
          id, mesh,
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 0.5,
          orbit: 0.3 + Math.random() * 0.8,
          y: 1.5 + Math.random() * 3,
        };
        fishGroup.add(mesh);
        fishAgents.push(agent);
      }
    }
  }, [ownedFish]);

  React.useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const handleTouch = (e) => {
    const s = stateRef.current;
    if (!s.onCellTap || !glRef.current) return;
    const { locationX, locationY } = e.nativeEvent;
    const gl = glRef.current;
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    // simple reverse projection onto board plane (y up, board at y≈0)
    const ndc = {
      x: (locationX / (w / 2)) * 2 - 1,
      y: -((locationY / (h / 2)) * 2 - 1),
    };
    // Approximation: precomputed mapping from screen fraction to board grid
    const fracX = ndc.x / 2 + 0.5;
    const fracY = ndc.y / 2 + 0.5;
    const c = Math.floor(fracX * COLS);
    const r = Math.floor(fracY * ROWS);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) s.onCellTap(r, c);
  };

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreated={onGLContextCreated}
      onTouchEnd={handleTouch}
    />
  );
}
