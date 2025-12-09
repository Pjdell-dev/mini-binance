import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await login(email, password, remember);
      
      if (result.requires_2fa) {
        toast.success('2FA verification required');
        navigate('/auth/2fa');
      } else if (result.requires_verification) {
        toast.error('Please verify your email first');
      } else {
        toast.success('Login successful!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold text-white mb-6">Sign In</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
            autoComplete="email"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-dark-300">Remember me</span>
          </label>
          
          <Link to="/auth/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-dark-400">
          Don't have an account?{' '}
          <Link to="/auth/register" className="text-primary-400 hover:text-primary-300">
            Sign up
          </Link>
        </p>
      </div>

      {/* Demo Accounts Hint */}
      <div className="mt-6 p-4 bg-dark-800 rounded-lg border border-dark-700">
        <p className="text-xs text-dark-400 mb-2">Demo Accounts:</p>
        <div className="text-xs text-dark-300 space-y-1">
          <div>Admin: admin@minibinance.local / Admin@12345678</div>
          <div>User: user2fa@minibinance.local / User2FA@12345678</div>
        </div>
      </div>
    </div>
  );
}
