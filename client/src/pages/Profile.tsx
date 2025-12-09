import { useState, useEffect } from 'react';
import { User, Shield, Key, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function Profile() {
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  });
  const [loading, setLoading] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<number | null>(null);

  // Fetch fresh user data when component mounts
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.password_confirmation) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setTwoFactorLoading(true);
      const res = await api.post('/2fa/enable');
      setQrCode(res.data.qr_code);
      setSecret(res.data.secret);
      setShowQrModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to enable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setTwoFactorLoading(true);
      const res = await api.post('/2fa/verify', { code: verificationCode });
      setBackupCodes(res.data.backup_codes || []);
      toast.success('Two-factor authentication enabled successfully!');
      setVerificationCode('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) return;
    
    try {
      setTwoFactorLoading(true);
      await api.post('/2fa/disable');
      toast.success('Two-factor authentication disabled');
      window.location.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-white">Profile Settings</h1>

      {/* User Info */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
            <User className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Account Information</h2>
            <p className="text-dark-300 text-sm">Your personal details</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Name</label>
            <div className="input bg-dark-700 cursor-not-allowed">{user?.name}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Email</label>
            <div className="input bg-dark-700 cursor-not-allowed">{user?.email}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Account Status</label>
            <div className="flex items-center gap-2">
              {user?.email_verified_at ? (
                <span className="text-xs px-3 py-1 rounded bg-success-500/20 text-success-400">Verified</span>
              ) : (
                <span className="text-xs px-3 py-1 rounded bg-warning-500/20 text-warning-400">Unverified</span>
              )}
              {user?.mfa_enabled ? (
                <span className="text-xs px-3 py-1 rounded bg-primary-500/20 text-primary-400">2FA Enabled</span>
              ) : (
                <span className="text-xs px-3 py-1 rounded bg-dark-600 text-dark-400">2FA Disabled</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-danger-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-danger-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Security Settings</h2>
            <p className="text-dark-300 text-sm">Manage your password and 2FA</p>
          </div>
        </div>
        
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Current Password</label>
            <input
              type="password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">New Password</label>
            <input
              type="password"
              value={passwordForm.password}
              onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={passwordForm.password_confirmation}
              onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* 2FA Management */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-warning-500/20 flex items-center justify-center">
            <Key className="w-6 h-6 text-warning-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
            <p className="text-dark-300 text-sm">Add an extra layer of security</p>
          </div>
        </div>
        <div className="space-y-4">
          <p className="text-dark-300">
            {user?.mfa_enabled
              ? 'Two-factor authentication is currently enabled on your account.'
              : 'Enable two-factor authentication to secure your account with an additional verification step.'}
          </p>
          <button 
            onClick={user?.mfa_enabled ? handleDisable2FA : handleEnable2FA}
            disabled={twoFactorLoading}
            className="btn bg-warning-500 hover:bg-warning-600 text-white disabled:opacity-50"
          >
            {twoFactorLoading ? 'Processing...' : (user?.mfa_enabled ? 'Disable 2FA' : 'Enable 2FA')}
          </button>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowQrModal(false)}>
          <div className="bg-dark-900 border border-dark-700 rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Setup Two-Factor Authentication</h3>
            
            {qrCode && !backupCodes.length ? (
              <div className="space-y-4">
                <p className="text-dark-300 text-sm">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="bg-white p-4 rounded-lg" dangerouslySetInnerHTML={{ __html: qrCode }} />
                
                <div className="bg-dark-800 p-3 rounded-lg">
                  <p className="text-dark-400 text-xs mb-1">Or enter this code manually:</p>
                  <p className="text-white font-mono text-sm">{secret}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Enter 6-digit code from your app
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <button
                  onClick={handleVerify2FA}
                  disabled={verificationCode.length !== 6 || twoFactorLoading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            ) : backupCodes.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-warning-500/10 border border-warning-500/30 rounded-lg p-4">
                  <p className="text-warning-400 font-medium mb-2">⚠️ Save your backup codes!</p>
                  <p className="text-dark-300 text-sm">
                    Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
                  </p>
                </div>

                <div className="bg-dark-800 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-2">
                    {backupCodes.map((code, index) => (
                      <div key={index} className="flex items-center justify-between bg-dark-700 p-2 rounded">
                        <span className="font-mono text-sm text-white">{code}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            setCopiedCode(index);
                            setTimeout(() => setCopiedCode(null), 2000);
                          }}
                          className="text-dark-400 hover:text-white"
                        >
                          {copiedCode === index ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowQrModal(false);
                    setBackupCodes([]);
                    setQrCode('');
                    setSecret('');
                    window.location.reload();
                  }}
                  className="btn-primary w-full"
                >
                  I've Saved My Backup Codes
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}