import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { pretty } from '../lib/utils';
import { pickQuote } from '../lib/quotes';

/* The commitment certificate.
   Contains: start date · end date (stacked vertically, never on one line) ·
   SHA-512 hash · QR → /hash/{hash} · username · commitment-id.
   NEVER the statement, never the link text.
   progress == null  → motivational quote (first download, no progress yet)
   progress set      → live verification certificate (updated daily)          */
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

  /* ── canvas painting (1400×800, dates stacked vertically) ── */
  const wrapLines = (ctx, text, maxW) => {
    const words = String(text).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };

  /* wrap a run of characters (for the SHA-512 hex string, which has no spaces) */
  const wrapChars = (ctx, text, maxW) => {
    const lines = [];
    let line = '';
    for (const ch of String(text)) {
      if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
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
    const LX = 78;                    // left column x
    const LMAX = 920;                 // left column max width (before the QR plate)

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#063d29'); bg.addColorStop(0.55, '#02140d'); bg.addColorStop(1, '#043323');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * 0.86, 0, 60, W * 0.86, 0, 640);
    rg.addColorStop(0, 'rgba(16,185,129,.32)'); rg.addColorStop(1, 'rgba(16,185,129,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    rrect(ctx, 26, 26, W - 52, H - 52, 34);
    ctx.strokeStyle = 'rgba(52,211,153,.45)'; ctx.lineWidth = 3; ctx.stroke();

    /* brand + commitment id */
    ctx.fillStyle = '#6ee7b7'; ctx.font = '700 24px monospace'; ctx.textAlign = 'left';
    ctx.fillText('◈ DSA·400 — THE CONSISTENCY ENGINE', LX, 92);
    const cid = commitment.commit_id || '—';
    ctx.font = '800 30px "JetBrains Mono",monospace';
    const cw = ctx.measureText(cid).width;
    rrect(ctx, W - 78 - cw - 44, 58, cw + 44, 52, 14);
    ctx.fillStyle = 'rgba(16,185,129,.12)'; ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#a7f3d0'; ctx.fillText(cid, W - 78 - cw - 20, 95);

    /* dates — stacked vertically, never side by side */
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('START DATE', LX, 186);
    ctx.fillStyle = '#34d399'; ctx.font = '800 56px Poppins, sans-serif';
    ctx.fillText(pretty(commitment.start_date), LX, 248);

    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('END DATE · 400 DAYS OF CONSISTENCY', LX, 322);
    ctx.fillStyle = '#34d399'; ctx.font = '800 56px Poppins, sans-serif';
    ctx.fillText(pretty(commitment.end_date), LX, 384);

    /* hash — wrapped dynamically, no link text */
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('SHA-512 · STATEMENT + USER ID', LX, 458);
    ctx.fillStyle = '#a7f3d0'; ctx.font = '500 21px "JetBrains Mono",monospace';
    const hash = commitment.hash || '';
    let hashLines = wrapChars(ctx, hash, LMAX);
    if (hashLines.length > 3) {
      hashLines = hashLines.slice(0, 3);
      hashLines[2] = hashLines[2].slice(0, Math.max(0, hashLines[2].length - 3)) + '…';
    }
    let hy = 490;
    hashLines.forEach(l => { ctx.fillText(l, LX, hy); hy += 30; });

    /* username */
    ctx.fillStyle = '#7fb8a2'; ctx.font = '600 17px monospace';
    ctx.fillText('HELD BY', LX, 620);
    ctx.fillStyle = '#f2f7f4'; ctx.font = '800 34px Poppins, sans-serif';
    ctx.fillText(username || '—', LX, 664);

    /* bottom band — quote (no progress) or live progress */
    rrect(ctx, LX, 716, LMAX, 56, 16);
    ctx.fillStyle = 'rgba(16,185,129,.08)'; ctx.fill();
    ctx.strokeStyle = 'rgba(52,211,153,.28)'; ctx.lineWidth = 1; ctx.stroke();
    if (progress) {
      const pct = progress.activeDays ? Math.round(100 * progress.sealed / progress.activeDays) : 0;
      ctx.fillStyle = '#a7f3d0'; ctx.font = '700 19px "JetBrains Mono",monospace';
      ctx.fillText(`PROGRESS  ·  ${progress.sealed}/${progress.activeDays} days  ·  ${pct}%  ·  streak ${progress.streak}  ·  ${progress.solved} solved`, LX + 22, 751);
    } else {
      ctx.fillStyle = '#6ee7b7'; ctx.font = 'italic 600 19px Poppins, sans-serif';
      let ql = wrapLines(ctx, '“' + theQuote + '”', LMAX - 44);
      if (ql.length > 2) { ql = ql.slice(0, 2); ql[1] = ql[1].slice(0, Math.max(0, ql[1].length - 3)) + '…'; }
      ql.forEach((l, i) => ctx.fillText(l, LX + 22, 743 + i * 26));
    }

    /* QR plate */
    rrect(ctx, 1068, 452, 264, 264, 24);
    ctx.fillStyle = '#eafff7'; ctx.fill();
    if (qr) {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = qr; });
      ctx.drawImage(img, 1082, 466, 236, 236);
    }
    ctx.fillStyle = '#04301f'; ctx.font = '800 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText('scan to verify', 1200, 762);
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
