import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { pretty } from '../lib/utils';
import { pickQuote } from '../lib/quotes';

/* The commitment certificate.
   Contains: start date · end date · SHA-512 hash · QR → /hash/{hash} ·
   username · commitment-id.  NEVER the statement, never the link text.
   progress == null  → motivational quote (first download, no progress yet)
   progress set      → live verification certificate (updated daily)      */
export default function CommitmentCard({ commitment, username, progress = null, quote = null }) {
  const [qr, setQr] = useState(null);
  const canvasRef = useRef(null);
  const link = `${window.location.origin}/hash/${commitment.hash}`;
  const theQuote = useMemo(() => quote || pickQuote(), [quote]);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { width: 400, margin: 1, color: { dark: '#03271a', light: '#eafff7' } })
      .then(u => alive && setQr(u)).catch(() => {});
    return () => { alive = false; };
  }, [link]);

  /* ── canvas painting (7:4 download) ── */
  const wrap = (ctx, text, x, y, maxW, lh) => {
    const words = String(text).split(' ');
    let line = '', yy = y;
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line.trim(), x, yy); line = w + ' '; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line.trim(), x, yy);
    return yy;
  };
  const rrect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const paint = async () => {
    const cv = canvasRef.current, ctx = cv.getContext('2d');
    const W = 1400, H = 800;
    cv.width = W; cv.height = H;

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#063d29'); bg.addColorStop(0.55, '#02140d'); bg.addColorStop(1, '#043323');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * 0.86, 0, 60, W * 0.86, 0, 640);
    rg.addColorStop(0, 'rgba(16,185,129,.32)'); rg.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // accent frame
    rrect(ctx, 26, 26, W - 52, H - 52, 34);
    ctx.strokeStyle = 'rgba(52,211,153,.45)'; ctx.lineWidth = 3; ctx.stroke();

    // brand + commitment id
    ctx.fillStyle = '#6ee7b7'; ctx.font = '700 24px monospace';
    ctx.fillText('◈ DSA·400 — THE CONSISTENCY ENGINE', 78, 92);
    const cid = commitment.commit_id || '—';
    ctx.font = '800 30px "JetBrains Mono",monospace';
    const cw = ctx.measureText(cid).width;
    rrect(ctx, W - 78 - cw - 44, 58, cw + 44, 52, 14);
    ctx.fillStyle = 'rgba(16,185,129,.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#a7f3d0'; ctx.textAlign = 'left';
    ctx.fillText(cid, W - 78 - cw - 20, 95);

    // dates
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('START DATE', 78, 250);
    ctx.fillText('END DATE — 400 DAYS OF CONSISTENCY', 428, 250);
    ctx.fillStyle = '#34d399'; ctx.font = '800 62px Poppins, sans-serif';
    ctx.fillText(pretty(commitment.start_date), 78, 322);
    ctx.fillText(pretty(commitment.end_date), 428, 322);
    // arrow
    ctx.fillStyle = 'rgba(52,211,153,.6)'; ctx.font = '600 30px monospace';
    ctx.fillText('→', 372, 320);

    // hash (no link text)
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('SHA-512 — STATEMENT + USER ID', 78, 440);
    ctx.fillStyle = '#a7f3d0'; ctx.font = '500 21px "JetBrains Mono",monospace';
    const hash = commitment.hash || '';
    for (let i = 0; i < hash.length; i += 60) ctx.fillText(hash.slice(i, i + 60), 78, 472 + (i / 60) * 30);

    // username
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 18px monospace';
    ctx.fillText('HELD BY', 78, 640);
    ctx.fillStyle = '#f2f7f4'; ctx.font = '800 34px Poppins, sans-serif';
    ctx.fillText(username || '—', 78, 686);

    // bottom band: quote (no progress) or progress tracks
    rrect(ctx, 78, 718, 720, 54, 16);
    ctx.fillStyle = 'rgba(16,185,129,.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,.28)'; ctx.lineWidth = 1; ctx.stroke();
    if (progress) {
      const pct = progress.activeDays ? Math.round(100 * progress.sealed / progress.activeDays) : 0;
      ctx.fillStyle = '#a7f3d0'; ctx.font = '700 19px "JetBrains Mono",monospace';
      ctx.fillText(`PROGRESS  ·  ${progress.sealed}/${progress.activeDays} days  ·  ${pct}%  ·  streak ${progress.streak}  ·  ${progress.solved} solved`, 100, 752);
    } else {
      ctx.fillStyle = '#6ee7b7'; ctx.font = 'italic 600 20px Poppins, sans-serif';
      wrap(ctx, '“' + theQuote + '”', 100, 752, 680, 26);
    }

    // QR plate
    rrect(ctx, 1070, 460, 262, 262, 24);
    ctx.fillStyle = '#eafff7'; ctx.fill();
    if (qr) {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = qr; });
      ctx.drawImage(img, 1084, 474, 234, 234);
    }
    ctx.fillStyle = '#04301f'; ctx.font = '800 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText('scan to verify', 1201, 760);
    ctx.textAlign = 'left';
  };

  const download = async () => {
    await paint();
    const a = document.createElement('a');
    a.download = `dsa400-certificate-${commitment.commit_id || commitment.hash.slice(0, 8)}.png`;
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
  };

  const pct = progress ? (progress.activeDays ? Math.round(100 * progress.sealed / progress.activeDays) : 0) : 0;

  return (
    <div>
      <div className="cert">
        <div className="cert-top">
          <span className="cert-brand">◈ DSA·400 — THE CONSISTENCY ENGINE</span>
          <span className="cert-cid">{commitment.commit_id || '—'}</span>
        </div>
        <div className="cert-grid">
          <div>
            <div className="cert-dates">
              <div className="cert-date">
                <span className="cert-l">Start date</span>
                <span className="cert-v">{pretty(commitment.start_date)}</span>
              </div>
              <span className="cert-arrow">→</span>
              <div className="cert-date">
                <span className="cert-l">End date · 400 days</span>
                <span className="cert-v">{pretty(commitment.end_date)}</span>
              </div>
            </div>
            <div className="cert-hash">
              <span className="cert-l">SHA-512 · statement + user id</span>
              <code>{commitment.hash}</code>
            </div>
            <div className="cert-user">
              <span className="cert-l">Held by</span>
              <span className="cert-name">{username || '—'}</span>
            </div>
            <div className="cert-band">
              {progress
                ? <>PROGRESS · <b>{progress.sealed}/{progress.activeDays}</b> days · <b>{pct}%</b> · streak <b>{progress.streak}</b> · <b>{progress.solved}</b> solved</>
                : <>“{theQuote}”</>}
            </div>
          </div>
          <div className="cert-qr">
            {qr ? <img src={qr} alt="commitment QR code" /> : <span className="cert-qr-holder">…</span>}
            <span className="cert-qr-hint">scan to verify</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={download}>
          ⬇ {progress ? 'Download updated certificate' : 'Download commitment image (7:4)'}
        </button>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
