const Stage = (() => {
  const W = 1280, H = 720;

  function starfield(ctx, t, { speed = 0.02, density = 90, alpha = 1 } = {}) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < density; i++) {
      const seed = i * 137.5077;
      const x = ((seed * 7.3 + t * speed * (20 + (i % 7) * 12)) % (W + 40)) - 20;
      const y = (seed * 3.7) % H;
      const tw = 0.4 + Math.sin(t * (1 + (i % 5) * 0.3) + i) * 0.35;
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      const size = i % 11 === 0 ? 2.2 : 1.1;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  function cityBackdrop(ctx, t, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a1030');
    grad.addColorStop(0.55, '#141b3d');
    grad.addColorStop(1, '#1e2a52');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    starfield(ctx, t, { density: 120 });

    // floating islands
    const islands = [
      { x: 140, y: 300, w: 260, h: 46 },
      { x: 880, y: 250, w: 320, h: 52 },
      { x: 520, y: 420, w: 200, h: 38 },
    ];
    for (const [i, isl] of islands.entries()) {
      const float = Math.sin(t * 0.6 + i * 2) * 6;
      ctx.fillStyle = '#25306a';
      ctx.beginPath();
      ctx.moveTo(isl.x, isl.y + float);
      ctx.lineTo(isl.x + isl.w, isl.y + float);
      ctx.lineTo(isl.x + isl.w * 0.7, isl.y + isl.h + float);
      ctx.lineTo(isl.x + isl.w * 0.3, isl.y + isl.h + float);
      ctx.closePath(); ctx.fill();
      // towers
      ctx.fillStyle = '#31418f';
      const towers = 2 + (i % 2);
      for (let k = 0; k < towers; k++) {
        const tw = 26;
        const th = 60 + ((i * 37 + k * 53) % 50);
        const tx = isl.x + 30 + k * (isl.w - 70) / Math.max(1, towers - 1);
        ctx.fillRect(tx, isl.y + float - th, tw, th);
        ctx.fillStyle = 'rgba(255, 230, 150, 0.85)';
        ctx.fillRect(tx + 8, isl.y + float - th + 12, 6, 8);
        ctx.fillRect(tx + 14, isl.y + float - th + 30, 6, 8);
        ctx.fillStyle = '#31418f';
      }
      // window lights
      ctx.fillStyle = 'rgba(255, 220, 130, 0.6)';
      for (let w = 0; w < 8; w++) {
        if ((i * 9 + w) % 3 === 0) {
          ctx.fillRect(isl.x + 20 + w * 28, isl.y + float + 10, 5, 5);
        }
      }
    }
    ctx.restore();
  }

  function academyRoom(ctx, t) {
    ctx.fillStyle = '#1c1633';
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(W / 2, H * 0.4, 60, W / 2, H * 0.4, 500);
    grad.addColorStop(0, 'rgba(120, 100, 200, 0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#2a2350';
    ctx.fillRect(0, H - 140, W, 140);
    for (let i = 0; i < 12; i++) ctx.fillRect(i * 110, H - 150, 3, 150);

    // big window with stars
    ctx.fillStyle = '#0d1330';
    ctx.fillRect(140, 90, 340, 300);
    ctx.strokeStyle = '#4a4070';
    ctx.lineWidth = 8;
    ctx.strokeRect(140, 90, 340, 300);
    ctx.beginPath(); ctx.moveTo(310, 90); ctx.lineTo(310, 390); ctx.stroke();
    starfield(ctx, t, { density: 25, alpha: 0.8 });

    // desk
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(700, H - 220, 420, 26);
    ctx.fillRect(720, H - 194, 16, 60);
    ctx.fillRect(1080, H - 194, 16, 60);
  }

  function starbridge(ctx, t) {
    ctx.fillStyle = '#080c22';
    ctx.fillRect(0, 0, W, H);
    starfield(ctx, t, { density: 150, speed: 0.05 });
    for (let i = 0; i < 6; i++) {
      const px = 60 + i * 220;
      const py = 520 - Math.sin(i * 0.9) * 120;
      ctx.strokeStyle = 'rgba(150, 180, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2); ctx.stroke();
      const glow = ctx.createRadialGradient(px, py, 2, px, py, 40);
      glow.addColorStop(0, 'rgba(180, 200, 255, 0.5)');
      glow.addColorStop(1, 'rgba(180, 200, 255, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(px - 40, py - 40, 80, 80);
    }
    ctx.strokeStyle = 'rgba(200, 180, 120, 0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-40, 560);
    for (let x = 0; x <= W + 80; x += 20) {
      ctx.lineTo(x, 560 - Math.sin(x * 0.004) * 40);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 180, 120, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-40, 530);
    for (let x = 0; x <= W + 80; x += 20) {
      ctx.lineTo(x, 530 - Math.sin(x * 0.004) * 40);
    }
    ctx.stroke();
  }

  function nightSky(ctx, t) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#060a1e');
    grad.addColorStop(1, '#101838');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    starfield(ctx, t, { density: 200, speed: 0.03 });
    // moon
    const mg = ctx.createRadialGradient(1050, 140, 20, 1050, 140, 90);
    mg.addColorStop(0, 'rgba(255,250,220,0.9)');
    mg.addColorStop(1, 'rgba(255,250,220,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(960, 50, 180, 180);
    ctx.fillStyle = '#f8f4e0';
    ctx.beginPath(); ctx.arc(1050, 140, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e2c8';
    ctx.beginPath(); ctx.arc(1040, 132, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1062, 150, 4, 0, Math.PI * 2); ctx.fill();
  }

  function subtitleBox(ctx, text, speaker) {
    ctx.save();
    ctx.font = '600 26px "Segoe UI", sans-serif';
    const display = text.length > 92 ? text.slice(0, 92) + '…' : text;
    const w = ctx.measureText(display).width + 60;
    const x = (W - w) / 2;
    const y = H - 110;
    ctx.fillStyle = 'rgba(8, 10, 26, 0.82)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, 52, 10) : ctx.rect(x, y, w, 52);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160, 180, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#ffd98a';
    ctx.font = '700 15px "Segoe UI", sans-serif';
    ctx.fillText(speaker, x + 26, y + 20);
    ctx.fillStyle = '#e8ecf8';
    ctx.font = '600 21px "Segoe UI", sans-serif';
    ctx.fillText(display, x + 26, y + 42);
    ctx.restore();
  }

  return { W, H, starfield, cityBackdrop, academyRoom, starbridge, nightSky, subtitleBox };
})();
window.Stage = Stage;
