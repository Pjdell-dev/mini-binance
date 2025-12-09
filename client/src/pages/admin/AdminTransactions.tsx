import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Transaction {
  id: number;
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  asset_id: number;
  asset: {
    symbol: string;
    name: string;
  };
  type: 'deposit' | 'withdrawal';
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/admin/transactions/pending', {
        params: { status: filter }
      });
      // Laravel pagination returns { transactions: { data: [...], ...pagination } }
      const txs = res.data?.transactions?.data || res.data?.transactions || [];
      setTransactions(txs);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTransactions();
  }, [filter]);

  const handleApprove = async (txId: number) => {
    if (!confirm('Are you sure you want to approve this transaction?')) return;

    setActionLoading(txId);
    try {
      await api.post(`/admin/transactions/${txId}/approve`);
      toast.success('Transaction approved successfully');
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve transaction');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (txId: number) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    setActionLoading(txId);
    try {
      await api.post(`/admin/transactions/${txId}/reject`, { reason });
      toast.success('Transaction rejected');
      fetchTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject transaction');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Transaction Management</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                ? 'bg-primary-500 text-white'
                : 'bg-dark-600 text-dark-300 hover:bg-dark-500'
              }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-dark-700 rounded-lg border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-600 text-dark-300 text-sm">
                <th className="text-left p-4">Type</th>
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Asset</th>
                <th className="text-right p-4">Amount</th>
                <th className="text-center p-4">Status</th>
                <th className="text-left p-4">Date</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-dark-600/50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {tx.type === 'deposit' ? (
                        <div className="flex items-center gap-2 text-green-400">
                          <ArrowDownCircle size={18} />
                          <span className="font-medium">Deposit</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-400">
                          <ArrowUpCircle size={18} />
                          <span className="font-medium">Withdrawal</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="text-white font-medium">{tx.user.name}</div>
                      <div className="text-dark-300 text-sm">{tx.user.email}</div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <div className="text-white font-medium">{tx.asset.symbol}</div>
                      <div className="text-dark-300 text-sm">{tx.asset.name}</div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-mono font-medium">
                      {parseFloat(tx.amount).toFixed(8)}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${tx.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : tx.status === 'approved' || tx.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                    >
                      {tx.status}
                    </span>
                    {tx.rejection_reason && (
                      <div className="text-red-400 text-xs mt-1">{tx.rejection_reason}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-white text-sm">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-dark-300 text-xs">
                      {new Date(tx.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    {tx.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApprove(tx.id)}
                          disabled={actionLoading === tx.id}
                          className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleReject(tx.id)}
                          disabled={actionLoading === tx.id}
                          className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    )}
                    {tx.status !== 'pending' && (
                      <div className="text-dark-400 text-sm text-right">
                        {tx.status === 'approved' || tx.status === 'completed' ? 'Processed' : 'Rejected'}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-12 text-dark-300">
            No {filter !== 'all' && filter} transactions found
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock className="text-yellow-400" size={24} />
            </div>
            <div>
              <div className="text-dark-300 text-sm">Pending</div>
              <div className="text-white text-2xl font-bold">
                {filter === 'pending' ? transactions.length : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <CheckCircle className="text-green-400" size={24} />
            </div>
            <div>
              <div className="text-dark-300 text-sm">Approved</div>
              <div className="text-white text-2xl font-bold">
                {filter === 'approved' ? transactions.length : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/20 rounded-lg">
              <XCircle className="text-red-400" size={24} />
            </div>
            <div>
              <div className="text-dark-300 text-sm">Rejected</div>
              <div className="text-white text-2xl font-bold">
                {filter === 'rejected' ? transactions.length : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}