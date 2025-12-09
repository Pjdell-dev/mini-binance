import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

export default function TwoFactorVerify() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const fetchUser = useAuthStore((state) => state.fetchUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.post('/auth/2fa/verify-login', { code });
      await fetchUser();
      toast.success('2FA verification successful!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow alphanumeric for backup codes (8 chars) or numeric for OTP (6 digits)
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(value);
  };

  return (
    <div className="card max-w-md mx-auto">
      <div className="flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary-400" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2 text-center">Two-Factor Authentication</h2>
      <p className="text-dark-300 text-center mb-6">
        Enter the 6-digit code from your authenticator app or an 8-character backup code
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-dark-300 mb-2">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={handleCodeChange}
            className="input text-center text-xl tracking-wider font-mono"
            required
            autoComplete="off"
            placeholder="000000 or ABC12345"
            maxLength={8}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || (code.length !== 6 && code.length !== 8)}
          className="btn btn-primary w-full disabled:opacity-50"
        >
          {isLoading ? 'Verifying...' : 'Verify & Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/auth/login" className="text-sm text-dark-400 hover:text-white">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
