import { Link } from 'react-router-dom';
import { Users, FileCheck, CreditCard, Wallet, FileText, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const adminFeatures = [
  {
    title: 'User Management',
    description: 'Freeze/unfreeze users and grant admin roles',
    icon: Users,
    path: '/admin/users',
    color: 'bg-blue-500/20 text-blue-400',
  },
  {
    title: 'KYC Management',
    description: 'Review and approve KYC documents',
    icon: FileCheck,
    path: '/admin/kyc',
    color: 'bg-green-500/20 text-green-400',
  },
  {
    title: 'Transaction Control',
    description: 'Approve/reject deposits and withdrawals',
    icon: CreditCard,
    path: '/admin/transactions',
    color: 'bg-yellow-500/20 text-yellow-400',
  },
  {
    title: 'Manual Operations',
    description: 'Credit/debit wallets directly',
    icon: Wallet,
    path: '/admin/wallets',
    color: 'bg-purple-500/20 text-purple-400',
  },
  {
    title: 'Audit Log Review',
    description: 'Complete system activity history',
    icon: FileText,
    path: '/admin/audit-logs',
    color: 'bg-red-500/20 text-red-400',
  },
];

interface Stats {
  total_users: number;
  active_users: number;
  frozen_users: number;
  pending_kyc: number;
  approved_kyc: number;
  pending_transactions: number;
  total_orders: number;
  open_orders: number;
  total_trades: number;
  trades_24h: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.stats);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="text-primary-400" size={32} />
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <p className="text-dark-300">
          Manage users, KYC verification, transactions, and system operations
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.path}
              to={feature.path}
              className="group bg-dark-700 rounded-lg border border-dark-600 p-6 hover:border-primary-500 transition-all hover:transform hover:scale-105"
            >
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-dark-300 text-sm">{feature.description}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-dark-700 rounded-lg border border-dark-600 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Overview</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-dark-600 rounded-lg p-4">
              <div className="text-dark-300 text-sm mb-1">Total Users</div>
              <div className="text-white text-2xl font-bold">{stats?.total_users || 0}</div>
            </div>
            <div className="bg-dark-600 rounded-lg p-4">
              <div className="text-dark-300 text-sm mb-1">Pending KYC</div>
              <div className="text-yellow-400 text-2xl font-bold">{stats?.pending_kyc || 0}</div>
            </div>
            <div className="bg-dark-600 rounded-lg p-4">
              <div className="text-dark-300 text-sm mb-1">Pending Transactions</div>
              <div className="text-yellow-400 text-2xl font-bold">{stats?.pending_transactions || 0}</div>
            </div>
            <div className="bg-dark-600 rounded-lg p-4">
              <div className="text-dark-300 text-sm mb-1">Active Orders</div>
              <div className="text-green-400 text-2xl font-bold">{stats?.open_orders || 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="mt-6 bg-dark-700 rounded-lg border border-dark-600 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-dark-300">API Server</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Online
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-300">Database</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-300">Queue Worker</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Running
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-300">Redis Cache</span>
            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}