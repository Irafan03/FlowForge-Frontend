import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../app/AuthContext';
import { authService } from '../../services/authService';

type AuthPageProps = { mode: 'login' | 'register' };
type AuthLocationState = { from?: { pathname?: string }; registered?: boolean };

export function AuthPage({ mode }: AuthPageProps) {
  const isLogin = mode === 'login';
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as AuthLocationState | null;
  const { establishSession } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    try {
      if (!isLogin) {
        await authService.register({
          email,
          password,
          full_name: String(formData.get('full_name') ?? '').trim() || undefined,
        });
        navigate('/login', { replace: true, state: { registered: true } });
        return;
      }

      const token = await authService.login({ email, password });
      establishSession(token.access_token, email, token.expires_in);
      const destination = routeState?.from?.pathname;
      navigate(destination && destination !== '/login' && destination !== '/register' ? destination : '/', { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }

  const registeredNotice = isLogin && routeState?.registered ? 'Compte créé. Connectez-vous pour continuer.' : '';

  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <Link className="brand auth-brand" to="/"><span className="brand-mark">f</span><span>flowforge<span className="brand-ai"> AI</span></span></Link>
        <div className="auth-visual-content"><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /><div className="auth-glow" /><div className="auth-visual-copy"><span className="auth-kicker">AUTOMATISEZ AVEC CLARTÉ</span><h2>Vos idées.<br /><em>En mouvement.</em></h2><p>Connectez vos outils et créez des workflows qui travaillent pour vous.</p><div className="auth-visual-dots"><span /><span /><span /></div></div><div className="auth-visual-note"><span>✦</span> L’automatisation, en toute simplicité.</div></div>
      </section>
      <section className="auth-form-side">
        <Link className="auth-back" to="/">← Retour à l’accueil</Link>
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-mark">f</span> flowforge<span className="brand-ai"> AI</span></div>
          <span className="auth-badge">✦ &nbsp; WORKSPACE AUTOMATION</span>
          <h1>{isLogin ? 'Bon retour parmi nous' : 'Créez votre espace'}</h1>
          <p className="auth-subtitle">{isLogin ? 'Connectez-vous pour retrouver vos workflows.' : 'Quelques informations pour démarrer avec FlowForge.'}</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && <label>Nom complet<input name="full_name" autoComplete="name" placeholder="Alex Martin" maxLength={255} /></label>}
            <label>Adresse e-mail<input name="email" type="email" autoComplete="email" placeholder="vous@exemple.com" required /></label>
            <label>Mot de passe<input name="password" type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="Au moins 8 caractères" minLength={isLogin ? undefined : 8} maxLength={128} required /></label>
            {isLogin && <a className="forgot-link" href="#forgot" onClick={(event) => { event.preventDefault(); setError('La récupération de mot de passe n’est pas disponible dans les routes backend actuelles.'); }}>Mot de passe oublié ?</a>}
            <button className="button button-primary auth-submit" type="submit" disabled={loading}>{loading ? 'Veuillez patienter…' : isLogin ? 'Se connecter' : 'Créer mon compte'} <span>→</span></button>
          </form>
          {(registeredNotice || notice) && <p className="auth-notice" role="status">{registeredNotice || notice}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <p className="auth-switch">{isLogin ? 'Pas encore de compte ?' : 'Vous avez déjà un compte ?'} <Link to={isLogin ? '/register' : '/login'}>{isLogin ? 'Créer un compte' : 'Se connecter'}</Link></p>
          <p className="auth-terms">En continuant, vous acceptez nos <a href="#terms">conditions d’utilisation</a> et notre <a href="#privacy">politique de confidentialité</a>.</p>
        </div>
        <span className="auth-copyright">© 2026 FlowForge AI</span>
      </section>
    </main>
  );
}
