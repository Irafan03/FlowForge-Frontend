import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../app/AuthContext';

const navigation = [
  { to: '/', label: 'Vue d’ensemble', icon: '◫', end: true },
  { to: '/workflows', label: 'Workflows', icon: '⌘' },
  { to: '/history', label: 'Exécutions', icon: '◷' },
  { to: '/credentials', label: 'Credentials', icon: '⌑' },
];

export function AppShell() {
  const [search, setSearch] = useState('');
  const { session, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/" aria-label="FlowForge, accueil">
          <span className="brand-mark">f</span>
          <span>flowforge<span className="brand-ai"> AI</span></span>
        </Link>

        <div className="workspace-switcher">
          <span className="workspace-avatar">F</span>
          <span className="workspace-copy"><strong>Mon espace</strong><small>Plan personnel</small></span>
          <span className="switcher-chevron">⌄</span>
        </div>

        <p className="nav-label">ESPACE DE TRAVAIL</p>
        <nav className="main-nav" aria-label="Navigation principale">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="usage-card">
            <div className="usage-top"><span>Utilisation</span><span className="usage-dot" /></div>
            <strong>Statistiques indisponibles</strong>
            <p>Les données seront visibles après connexion à l’API.</p>
          </div>
          <button className="profile-link" type="button" onClick={signOut} title="Se déconnecter">
            <span className="profile-avatar">{session.email.slice(0, 1).toLocaleUpperCase('fr')}</span>
            <span className="profile-copy"><strong>{session.email}</strong><small>Connecté</small></span>
            <span className="profile-menu">↪</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs"><span>FlowForge</span><span className="crumb-separator">/</span><strong>Espace de travail</strong></div>
          <div className="topbar-actions">
            <label className="search-box" onKeyDown={(event) => { if (event.key === 'Enter' && search.trim()) navigate(`/workflows?search=${encodeURIComponent(search.trim())}`); }}>
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" aria-label="Rechercher" />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Notifications indisponibles" title="Aucune route de notifications n’est disponible" disabled><span>♧</span></button>
            <button className="topbar-avatar" type="button" onClick={signOut} aria-label="Se déconnecter">{session.email.slice(0, 1).toLocaleUpperCase('fr')}</button>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
        <footer className="app-footer"><span>FlowForge AI</span><span>Automation workspace</span></footer>
      </div>
    </div>
  );
}
