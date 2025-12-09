import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LogOut, User, Wallet, TrendingUp, Package, Shield, Settings } from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="bg-dark-900 border-b border-dark-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-white">
                BinanceFlix
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link to="/trading" className="text-dark-300 hover:text-white transition">
                  Trading
                </Link>
                <Link to="/wallets" className="text-dark-300 hover:text-white transition">
                  Wallets
                </Link>
                <Link to="/orders" className="text-dark-300 hover:text-white transition">
                  Orders
                </Link>
                <Link to="/portfolio" className="text-dark-300 hover:text-white transition">
                  Portfolio
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-primary-400 hover:text-primary-300 transition">
                    Admin
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/profile" className="text-dark-300 hover:text-white transition">
                <User size={20} />
              </Link>
              <button
                onClick={handleLogout}
                className="text-dark-300 hover:text-white transition"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
