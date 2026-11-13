import React from 'react';
import { GLView } from 'expo-gl';
import { Renderer, TextureLoader } from 'expo-three';
import * as THREE from 'three';
import { createFarmScene } from '../three/scene';

export default function FarmScene3D({ plots, animals, time, weather, onPlotTap }) {
  const glRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTapRef = React.useRef(null);
  const stateRef = React.useRef({ plots, animals, time, weather, onPlotTap });
  stateRef.current = { plots, animals, time, weather, onPlotTap };

  const initPlots = React.useRef(null);

  const onGLContextCreated = async (gl) => {
    glRef.current = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.shadowMap.enabled = true;

    const farm = createFarmScene();
    sceneRef.current = farm;
    farm.scene.background = new THREE.Color(0x87c5e8);

    const numPlots = stateRef.current.plots.length;
    for (let i = 0; i < numPlots; i++) farm.makePlotMesh(i);
    initPlots.current = numPlots;

    // simple orbit camera state
    const cam = { angle: -0.5, dist: 26, height: 15, targetY: 0 };

    const renderLoop = () => {
      const s = stateRef.current;
      const farm = sceneRef.current;
      const t = performance.now() / 1000;
      const dt = 0.016;

      if (initPlots.current < s.plots.length) {
        for (let i = initPlots.current; i < s.plots.length; i++) farm.makePlotMesh(i);
        initPlots.current = s.plots.length;
      }

      farm.updateDayNight(s.time);
      farm.updatePlotPlants(s.plots);
      farm.syncAnimals(s.animals || []);
      farm.updateAnimals(dt, t);
      farm.updateRain(dt, s.weather === 'rain');
      farm.updateMarkers(s.plots);

      farm.camera.position.set(
        Math.sin(cam.angle) * cam.dist,
        cam.height,
        Math.cos(cam.angle) * cam.dist
      );
      farm.camera.lookAt(0, 0, 0);

      renderer.render(farm.scene, farm.camera);
      gl.endFrameEXP();
      rafRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  };

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (glRef.current) {
        try { glRef.current.endFrameEXP(); } catch (e) {}
      }
    };
  }, []);

  const handleTouch = (e) => {
    const farm = sceneRef.current;
    if (!farm) return;
    const s = stateRef.current;
    const { locationX, locationY } = e.nativeEvent;
    // normalized device coords
    const gl = glRef.current;
    const rect = { w: gl.drawingBufferWidth, h: gl.drawingBufferHeight };
    const ndcX = (locationX / (rect.w / (globalThis.devicePixelRatio || 2))) * 2 - 1;
    const ndcY = -((locationY / (rect.h / (globalThis.devicePixelRatio || 2))) * 2 - 1);

    // project plot centers and find nearest
    const positions = farm.plotScreenPositions(s.plots);
    let best = null, bestDist = 0.18;
    for (const p of positions) {
      if (!p) continue;
      const d = Math.hypot(p.x - ndcX, p.y - ndcY);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    if (best && s.onPlotTap) s.onPlotTap(best.index);
  };

  return (
    <GLView
      style={{ flex: 1 }}
      onContextCreated={onGLContextCreated}
      onTouchEnd={handleTouch}
    />
  );
}
