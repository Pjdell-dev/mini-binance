import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldX, Lock, Unlock, Crown, ShieldOff, Search } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_frozen: boolean;
  frozen_reason?: string;
  email_verified_at?: string;
  two_factor_enabled: boolean;
  kyc_verified_at?: string;
  orders_count: number;
  transactions_count: number;
  created_at: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      const usersData = Array.isArray(res.data?.users?.data) ? res.data.users.data : 
                       Array.isArray(res.data?.users) ? res.data.users : 
                       Array.isArray(res.data) ? res.data : [];
      setUsers(usersData);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleFreeze = async (userId: number) => {
    const reason = prompt('Enter reason for freezing this account:');
    if (!reason) return;

    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/freeze`, { reason });
      toast.success('User frozen successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to freeze user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfreeze = async (userId: number) => {
    if (!confirm('Are you sure you want to unfreeze this user?')) return;

    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/unfreeze`);
      toast.success('User unfrozen successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to unfreeze user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantAdmin = async (userId: number) => {
    if (!confirm('Are you sure you want to grant admin role to this user?')) return;

    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/grant-admin`);
      toast.success('Admin role granted successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to grant admin role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAdmin = async (userId: number) => {
    if (!confirm('Are you sure you want to revoke admin role from this user?')) return;

    setActionLoading(userId);
    try {
      await api.post(`/admin/users/${userId}/revoke-admin`);
      toast.success('Admin role revoked successfully');
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to revoke admin role');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300" size={20} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-dark-700 rounded-lg border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-600 text-dark-300 text-sm">
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Status</th>
                <th className="text-center p-4">2FA</th>
                <th className="text-center p-4">KYC</th>
                <th className="text-center p-4">Orders</th>
                <th className="text-center p-4">Transactions</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-dark-600/50">
                  <td className="p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{user.name}</span>
                        {user.is_admin && (
                          <span className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-xs">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-dark-300 text-sm">{user.email}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    {user.is_frozen ? (
                      <div>
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          Frozen
                        </span>
                        {user.frozen_reason && (
                          <div className="text-dark-300 text-xs mt-1">{user.frozen_reason}</div>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {user.two_factor_enabled ? (
                      <ShieldCheck className="inline text-green-400" size={18} />
                    ) : (
                      <ShieldX className="inline text-dark-400" size={18} />
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {user.kyc_verified_at ? (
                      <span className="text-green-400">✓</span>
                    ) : (
                      <span className="text-dark-400">–</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-white">{user.orders_count}</td>
                  <td className="p-4 text-center text-white">{user.transactions_count}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {user.is_frozen ? (
                        <button
                          onClick={() => handleUnfreeze(user.id)}
                          disabled={actionLoading === user.id}
                          className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50"
                          title="Unfreeze User"
                        >
                          <Unlock size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFreeze(user.id)}
                          disabled={actionLoading === user.id}
                          className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                          title="Freeze User"
                        >
                          <Lock size={16} />
                        </button>
                      )}

                      {user.is_admin ? (
                        <button
                          onClick={() => handleRevokeAdmin(user.id)}
                          disabled={actionLoading === user.id}
                          className="p-2 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 disabled:opacity-50"
                          title="Revoke Admin Role"
                        >
                          <ShieldOff size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleGrantAdmin(user.id)}
                          disabled={actionLoading === user.id}
                          className="p-2 bg-primary-500/20 text-primary-400 rounded hover:bg-primary-500/30 disabled:opacity-50"
                          title="Grant Admin Role"
                        >
                          <Crown size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-dark-300">
            No users found
          </div>
        )}
      </div>
    </div>
  );
}