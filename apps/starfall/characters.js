const Characters = (() => {
  function drawLumi(ctx, x, y, t, opts = {}) {
    const s = opts.scale || 1;
    const bob = Math.sin(t * 2.2) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);

    // hair glow
    const glow = ctx.createRadialGradient(0, -46, 4, 0, -46, 34);
    glow.addColorStop(0, 'rgba(180, 210, 255, 0.9)');
    glow.addColorStop(1, 'rgba(180, 210, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-40, -90, 80, 80);

    // cloak
    ctx.fillStyle = '#3d5a80';
    ctx.beginPath();
    ctx.moveTo(-14, -34); ctx.lineTo(14, -34);
    ctx.lineTo(20, 10); ctx.lineTo(-20, 10);
    ctx.closePath(); ctx.fill();

    // dress
    ctx.fillStyle = '#5b7dbe';
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.lineTo(10, -8);
    ctx.lineTo(15, 30); ctx.lineTo(-15, 30);
    ctx.closePath(); ctx.fill();

    // legs
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 4;
    const stride = Math.sin(t * 4) * 4;
    ctx.beginPath(); ctx.moveTo(-4, 30); ctx.lineTo(-4 + stride * 0.5, 46); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 30); ctx.lineTo(4 - stride * 0.5, 46); ctx.stroke();

    // head
    ctx.fillStyle = '#ffe0c2';
    ctx.beginPath(); ctx.arc(0, -46, 13, 0, Math.PI * 2); ctx.fill();

    // star hair
    ctx.fillStyle = '#b8ceff';
    ctx.beginPath(); ctx.arc(0, -52, 14, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(-12, -46, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -46, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 3; i++) {
      const px = -18 + i * 16;
      ctx.beginPath(); ctx.arc(px + Math.sin(t * 3 + i) * 4, -60 - (i % 2) * 6, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(-4, -47, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -47, 1.6, 0, Math.PI * 2); ctx.fill();

    // glowing freckles
    ctx.fillStyle = 'rgba(160, 200, 255, 0.9)';
    ctx.beginPath(); ctx.arc(-5, -43, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -43, 0.9, 0, Math.PI * 2); ctx.fill();

    // star staff
    if (opts.staff !== false) {
      ctx.strokeStyle = '#8a6f4d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(16, 20); ctx.lineTo(22, -50); ctx.stroke();
      const pulse = 0.7 + Math.sin(t * 5) * 0.3;
      ctx.fillStyle = `rgba(255, 240, 170, ${pulse})`;
      drawStarShape(ctx, 22, -56, 6);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawKaito(ctx, x, y, t, opts = {}) {
    const s = opts.scale || 1;
    const bob = Math.sin(t * 2 + 1) * 2.5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);

    // workshop coat
    ctx.fillStyle = '#7a5c3e';
    ctx.beginPath();
    ctx.moveTo(-13, -30); ctx.lineTo(13, -30);
    ctx.lineTo(17, 24); ctx.lineTo(-17, 24);
    ctx.closePath(); ctx.fill();

    // pants + boots
    ctx.fillStyle = '#4a4a5a';
    ctx.fillRect(-9, 24, 7, 16);
    ctx.fillRect(2, 24, 7, 16);
    ctx.fillStyle = '#2e2e38';
    ctx.fillRect(-11, 40, 11, 6);
    ctx.fillRect(0, 40, 11, 6);

    // head
    ctx.fillStyle = '#f5d3a8';
    ctx.beginPath(); ctx.arc(0, -44, 12, 0, Math.PI * 2); ctx.fill();

    // fox ears
    ctx.fillStyle = '#c96f3b';
    ctx.beginPath(); ctx.moveTo(-12, -52); ctx.lineTo(-4, -50); ctx.lineTo(-10, -62); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, -52); ctx.lineTo(4, -50); ctx.lineTo(10, -62); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a4a24';
    ctx.beginPath(); ctx.moveTo(-10, -54); ctx.lineTo(-6, -52); ctx.lineTo(-9, -59); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -54); ctx.lineTo(6, -52); ctx.lineTo(9, -59); ctx.closePath(); ctx.fill();

    // goggles
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-4.5, -47, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(4.5, -47, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.5, -47); ctx.lineTo(0.5, -47); ctx.stroke();
    ctx.fillStyle = 'rgba(140, 210, 255, 0.6)';
    ctx.beginPath(); ctx.arc(-4.5, -47, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5, -47, 3, 0, Math.PI * 2); ctx.fill();

    // tail
    ctx.fillStyle = '#c96f3b';
    const tailWag = Math.sin(t * 3) * 6;
    ctx.beginPath();
    ctx.moveTo(-15, 16);
    ctx.quadraticCurveTo(-32, 10 + tailWag, -28, -6 + tailWag);
    ctx.quadraticCurveTo(-20, 2, -15, 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5e8d8';
    ctx.beginPath(); ctx.arc(-28, -5 + tailWag, 4, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawNix(ctx, x, y, t, opts = {}) {
    const s = opts.scale || 1;
    const float = Math.sin(t * 3) * 8;
    const pulse = 0.75 + Math.sin(t * 6) * 0.25;
    ctx.save();
    ctx.translate(x, y + float);
    ctx.scale(s, s);

    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 18);
    glow.addColorStop(0, `rgba(255, 255, 220, ${0.9 * pulse})`);
    glow.addColorStop(1, 'rgba(255, 255, 220, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-20, -20, 40, 40);

    ctx.fillStyle = `rgba(255, 250, 200, ${pulse})`;
    drawStarShape(ctx, 0, 0, 9);
    ctx.fill();

    // little eyes
    ctx.fillStyle = '#4a4a6a';
    ctx.beginPath(); ctx.arc(-2.5, -1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.5, -1, 1, 0, Math.PI * 2); ctx.fill();

    // trailing sparks
    ctx.fillStyle = 'rgba(255,255,200,0.5)';
    for (let i = 1; i <= 3; i++) {
      const px = -Math.sin(t * 4 + i * 2) * 12 - i * 6;
      const py = Math.cos(t * 3 + i) * 4;
      ctx.beginPath(); ctx.arc(px, py, 1.5 - i * 0.3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawOrin(ctx, x, y, t, opts = {}) {
    const s = opts.scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = '#5a5a7a';
    ctx.beginPath();
    ctx.moveTo(-16, -28); ctx.lineTo(16, -28);
    ctx.lineTo(22, 30); ctx.lineTo(-22, 30);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8c8b0';
    ctx.beginPath(); ctx.arc(0, -46, 13, 0, Math.PI * 2); ctx.fill();
    // beard of constellations
    ctx.fillStyle = '#e8e8f8';
    ctx.beginPath();
    ctx.moveTo(-8, -42); ctx.quadraticCurveTo(0, -10, 8, -42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8fb8ff';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(-6 + i * 3, -38 + Math.sin(i * 1.5 + t) * 3, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(-4, -50, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -50, 1.6, 0, Math.PI * 2); ctx.fill();
    // hat
    ctx.fillStyle = '#3d3d5a';
    ctx.beginPath(); ctx.moveTo(-18, -54); ctx.lineTo(18, -54); ctx.lineTo(4, -74); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawStarShape(ctx, cx, cy, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  return { drawLumi, drawKaito, drawNix, drawOrin, drawStarShape };
})();
window.Characters = Characters;
