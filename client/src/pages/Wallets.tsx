import { useState, useEffect } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface WalletData {
  id: number;
  asset: {
    id: number;
    symbol: string;
    name: string;
    precision: number;
  };
  balance_available: string;
  balance_locked: string;
  balance_total: string;
}

export default function Wallets() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<'deposit' | 'withdraw' | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const res = await api.get('/wallets');
      const walletsData = Array.isArray(res.data?.wallets) ? res.data.wallets : 
                         Array.isArray(res.data) ? res.data : [];
      setWallets(walletsData);
    } catch (error: any) {
      console.error('Failed to load wallets:', error);
      toast.error('Failed to load wallets');
      setWallets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/transactions/deposit', {
        asset_symbol: selectedAsset,
        amount
      });
      toast.success('Deposit request submitted');
      setShowModal(null);
      setAmount('');
      loadWallets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Deposit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/transactions/withdraw', {
        asset_symbol: selectedAsset,
        amount
      });
      toast.success('Withdrawal request submitted');
      setShowModal(null);
      setAmount('');
      loadWallets();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-dark-300">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Wallets</h1>
        <button onClick={loadWallets} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-600">
                <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Asset</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">Available</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">In Orders</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">Total</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wallets && wallets.length > 0 ? wallets.map((wallet) => (
                <tr key={wallet.asset.symbol} className="border-b border-dark-700 hover:bg-dark-700">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <span className="text-primary-400 font-bold text-sm">{wallet.asset.symbol.substring(0, 2)}</span>
                      </div>
                      <span className="text-white font-medium">{wallet.asset.symbol}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-white font-mono">{parseFloat(wallet.balance_available).toFixed(8)}</td>
                  <td className="py-3 px-4 text-right text-warning-400 font-mono">{parseFloat(wallet.balance_locked).toFixed(8)}</td>
                  <td className="py-3 px-4 text-right text-white font-bold font-mono">{parseFloat(wallet.balance_total).toFixed(8)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setSelectedAsset(wallet.asset.symbol); setShowModal('deposit'); }}
                        className="text-success-400 hover:text-success-300 text-sm font-medium flex items-center gap-1"
                      >
                        <ArrowDownCircle className="w-4 h-4" />
                        Deposit
                      </button>
                      <button
                        onClick={() => { setSelectedAsset(wallet.asset.symbol); setShowModal('withdraw'); }}
                        className="text-danger-400 hover:text-danger-300 text-sm font-medium flex items-center gap-1"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                        Withdraw
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-dark-300">
                    {loading ? 'Loading wallets...' : 'No wallets found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowModal(null)}>
          <div className="card max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">
              {showModal === 'deposit' ? 'Deposit' : 'Withdraw'} {selectedAsset}
            </h3>
            <form onSubmit={showModal === 'deposit' ? handleDeposit : handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00000000"
                  className="input"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 ${showModal === 'deposit' ? 'btn bg-success-500 hover:bg-success-600' : 'btn bg-danger-500 hover:bg-danger-600'} text-white`}
                >
                  {submitting ? 'Processing...' : showModal === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}