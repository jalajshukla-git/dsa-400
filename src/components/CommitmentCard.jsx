import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { pretty } from '../lib/utils';

/* The displayed, theme-integrated commitment card + a canvas-rendered
   7:4 download with an embedded QR code pointing at /hash/{hash}. */
export default function CommitmentCard({ commitment, username }) {
  const [qr, setQr] = useState(null);
  const canvasRef = useRef(null);
  const link = `${window.location.origin}/hash/${commitment.hash}`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, {
      width: 380, margin: 1,
      color: { dark: '#03301f', light: '#eafff7' },
    }).then(u => alive && setQr(u)).catch(() => {});
    return () => { alive = false; };
  }, [link]);

  const wrap = (ctx, text, x, y, maxW, lh) => {
    const words = text.split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = w + ' '; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line.trim(), x, yy);
    return yy;
  };

  const download = async () => {
    const cv = canvasRef.current;
    const ctx = cv.getContext('2d');
    const W = 1400, H = 800;
    cv.width = W; cv.height = H;

    // background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#06402a'); bg.addColorStop(0.55, '#02140d'); bg.addColorStop(1, '#05301f');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // glow orb
    const rg = ctx.createRadialGradient(W * 0.82, 0, 60, W * 0.82, 0, 640);
    rg.addColorStop(0, 'rgba(16,185,129,.35)'); rg.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // kicker
    ctx.fillStyle = '#6ee7b7'; ctx.font = '600 26px monospace';
    ctx.fillText('DSA·400 — THE CONSISTENCY ENGINE', 64, 84);

    // statement
    ctx.fillStyle = '#f2f7f4'; ctx.font = '700 44px Poppins, sans-serif';
    const st = '“' + commitment.statement + '”';
    wrap(ctx, st, 64, 170, 820, 62);

    // dates
    const dy = 430;
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('START DATE', 64, dy - 18);
    ctx.fillText('END DATE (400 days of consistency)', 64 + 300, dy - 18);
    ctx.fillStyle = '#34d399'; ctx.font = '800 58px Poppins, sans-serif';
    ctx.fillText(pretty(commitment.start_date), 64, dy + 46);
    ctx.fillText(pretty(commitment.end_date), 64 + 300, dy + 46);

    // hash
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('SHA-512 · statement + salt(user id)', 64, 570);
    ctx.fillStyle = '#a7f3d0'; ctx.font = '400 19px monospace';
    const hash = commitment.hash;
    const per = 64;
    for (let i = 0; i < hash.length; i += per) ctx.fillText(hash.slice(i, i + per), 64, 600 + (i / per) * 30);

    // username
    if (username) { ctx.fillStyle = '#7fb8a2'; ctx.font = '600 18px monospace'; ctx.fillText('— ' + username, 64, 700); }

    // QR plate
    ctx.fillStyle = '#eafff7';
    const qx = 1060, qy = 300, qs = 260, pad = 20;
    roundRect(ctx, qx - pad, qy - pad, qs + pad * 2, qs + pad * 2, 28); ctx.fill();
    if (qr) {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = qr; });
      ctx.drawImage(img, qx, qy, qs, qs);
    }
    ctx.fillStyle = '#03301f'; ctx.font = '700 19px monospace';
    ctx.fillText('scan to verify', qx + qs / 2 - 85, qy + qs + 46);

    // footer
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText(link, 64, 756);

    const a = document.createElement('a');
    a.download = `dsa400-commitment-${commitment.start_date}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  };

  return (
    <div>
      <div className="commit-card">
        <div className="commit-st">◈ The commitment</div>
        <div className="commit-grid">
          <div>
            <div className="commit-statement">“{commitment.statement}”</div>
            <div className="commit-dates">
              <div className="cd">
                <div className="l">Start date</div>
                <div className="v">{pretty(commitment.start_date)}</div>
              </div>
              <div className="cd">
                <div className="l">End date</div>
                <div className="v">{pretty(commitment.end_date)}</div>
              </div>
            </div>
            <div className="commit-hash"><b>SHA-512</b> · {commitment.hash}</div>
          </div>
          <div className="commit-qr">
            {qr ? <img src={qr} alt="commitment QR code" /> : <span style={{ color: '#03301f', fontSize: 12 }}>…</span>}
          </div>
        </div>
        <div className="commit-foot">
          <span>{link}</span>
          <span>{username || ''}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={download}>⬇ Download commitment image (7:4)</button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
