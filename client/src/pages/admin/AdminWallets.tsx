import { useState, useEffect } from 'react';
import { PlusCircle, MinusCircle, Search, Wallet } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Asset {
  id: number;
  symbol: string;
  name: string;
}

interface WalletBalance {
  id: number;
  asset: Asset;
  available_balance: string;
  locked_balance: string;
}

export default function AdminWallets() {
  const [users, setUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState<'credit' | 'debit'>('credit');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAssets();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users.data || []);
    } catch (error: any) {
      toast.error('Failed to load users');
    }
  };

  const fetchAssets = async () => {
    setAssets([
      { id: 1, symbol: 'BTC', name: 'Bitcoin' },
      { id: 2, symbol: 'ETH', name: 'Ethereum' },
      { id: 3, symbol: 'USDT', name: 'Tether' },
    ]);
  };

  const fetchUserWallets = async (userId: number) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setWallets(res.data.user.wallets || []);
      setSelectedUser(res.data.user);
    } catch (error: any) {
      toast.error('Failed to load user wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    fetchUserWallets(user.id);
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !selectedAsset || !amount || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = operation === 'credit' ? '/admin/wallets/credit' : '/admin/wallets/debit';
      await api.post(endpoint, {
        user_id: selectedUser.id,
        asset_symbol: selectedAsset,
        amount: parseFloat(amount),
        reason,
      });

      toast.success(`Wallet ${operation}ed successfully`);
      fetchUserWallets(selectedUser.id);
      setAmount('');
      setReason('');
      setSelectedAsset('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${operation} wallet`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Manual Wallet Operations</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Selection */}
        <div className="lg:col-span-1">
          <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Select User</h3>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300" size={18} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-primary-500/20 border-primary-500'
                      : 'bg-dark-600 border-dark-500 hover:border-dark-400'
                  }`}
                >
                  <div className="text-white font-medium">{user.name}</div>
                  <div className="text-dark-300 text-sm">{user.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Wallet Info & Operations */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <>
              {/* Current Balances */}
              <div className="bg-dark-700 rounded-lg border border-dark-600 p-4 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Balances</h3>

                {loading ? (
                  <div className="text-center py-8 text-dark-300">Loading wallets...</div>
                ) : wallets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {wallets.map((wallet) => (
                      <div key={wallet.id} className="bg-dark-600 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet size={18} className="text-primary-400" />
                          <span className="text-white font-semibold">{wallet.asset.symbol}</span>
                        </div>
                        <div className="text-dark-300 text-sm mb-1">
                          Available: <span className="text-white font-mono">{parseFloat(wallet.available_balance).toFixed(8)}</span>
                        </div>
                        <div className="text-dark-300 text-sm">
                          Locked: <span className="text-white font-mono">{parseFloat(wallet.locked_balance).toFixed(8)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-dark-300">No wallets found</div>
                )}
              </div>

              {/* Operation Form */}
              <div className="bg-dark-700 rounded-lg border border-dark-600 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Perform Operation</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Operation Type */}
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Operation Type
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setOperation('credit')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                          operation === 'credit'
                            ? 'bg-green-500 text-white'
                            : 'bg-dark-600 text-dark-300 hover:bg-dark-500'
                        }`}
                      >
                        <PlusCircle size={18} />
                        Credit (Add)
                      </button>
                      <button
                        type="button"
                        onClick={() => setOperation('debit')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                          operation === 'debit'
                            ? 'bg-red-500 text-white'
                            : 'bg-dark-600 text-dark-300 hover:bg-dark-500'
                        }`}
                      >
                        <MinusCircle size={18} />
                        Debit (Remove)
                      </button>
                    </div>
                  </div>

                  {/* Asset Selection */}
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Asset
                    </label>
                    <select
                      value={selectedAsset}
                      onChange={(e) => setSelectedAsset(e.target.value)}
                      className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      required
                    >
                      <option value="">Select Asset</option>
                      {assets.map((asset) => (
                        <option key={asset.id} value={asset.symbol}>
                          {asset.symbol} - {asset.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.00000001"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00000000"
                      className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white font-mono focus:outline-none focus:border-primary-500"
                      required
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-dark-300 text-sm font-medium mb-2">
                      Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Enter reason for this operation..."
                      rows={3}
                      className="w-full px-4 py-3 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500 resize-none"
                      required
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      operation === 'credit'
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {submitting
                      ? 'Processing...'
                      : `${operation === 'credit' ? 'Credit' : 'Debit'} ${amount || '0'} ${selectedAsset}`}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="bg-dark-700 rounded-lg border border-dark-600 p-12 text-center">
              <Wallet size={48} className="mx-auto text-dark-400 mb-4" />
              <p className="text-dark-300 text-lg">Select a user to manage their wallets</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
