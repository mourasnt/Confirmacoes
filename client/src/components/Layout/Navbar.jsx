import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/', label: 'Dashboard' },
  { to: '/conectar', label: 'Conectar' },
  { to: '/templates', label: 'Templates' },
  { to: '/config', label: 'Configurações' },
  { to: '/historico', label: 'Histórico' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-sm backdrop-blur-sm">
              3ZX
            </div>
            <span className="text-white font-semibold text-lg">Confirmações</span>
          </Link>

          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active = location.pathname === link.to || 
                (link.to !== '/' && location.pathname.startsWith(link.to));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white/20 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
