import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, displayName } from '../context/AuthContext';

export default function Nav({ onSearch }) {
  const { user, signOut, configured } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const go = path => { setOpen(false); nav(path); };

  return (
    <header id="nav">
      <div className="nav-in">
        <div className="brand" onClick={() => go('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-mark">◈</span>
          <span className="brand-name">DSA·400</span>
        </div>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <button className={`nav-link ${loc.pathname === '/' ? 'on' : ''}`} onClick={() => go('/')}>Tracker</button>
          <button className={`nav-link ${loc.pathname === '/patterns' ? 'on' : ''}`} onClick={() => go('/patterns')}>Pattern Master</button>
          <button className={`nav-link ${loc.pathname === '/questions' ? 'on' : ''}`} onClick={() => go('/questions')}>Questions</button>
          <button className={`nav-link ${loc.pathname === '/profile' ? 'on' : ''}`} onClick={() => go('/profile')}>Profile</button>
          <button className={`nav-link ${loc.pathname === '/file' ? 'on' : ''}`} onClick={() => go('/file')}>Ledger</button>
        </nav>
        <div className="nav-right">
          {onSearch && (
            <button className="icon-btn" title="Search by question or LeetCode number" onClick={onSearch}>⌕</button>
          )}
          {configured && !user && <button className="btn btn-primary btn-sm" onClick={() => go('/login')}>Sign in</button>}
          <span className="nav-user">
            {configured && user
              ? <b>{displayName(user)}</b>
              : !configured && <b>demo</b>}
            {configured && user && <button className="btn btn-ghost btn-sm" onClick={() => { signOut(); go('/login'); }}>Sign out</button>}
          </span>
          <button className="icon-btn nav-burger" onClick={() => setOpen(!open)} aria-label="Menu">≡</button>
        </div>
      </div>
    </header>
  );
}
