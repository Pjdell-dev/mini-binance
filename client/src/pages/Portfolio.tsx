import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Asset {
  id: number;
  symbol: string;
  name: string;
  precision: number;
}

interface WalletData {
  id: number;
  user_id: number;
  asset_id: number;
  balance_available: string;
  balance_locked: string;
  asset: Asset;
}

interface Order {
  id: number;
  market: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: string | null;
  quantity: string;
  quantity_filled: string;
  quantity_remaining: string;
  status: 'open' | 'partially_filled' | 'filled' | 'cancelled';
  created_at: string;
}

interface Trade {
  id: number;
  market: string;
  price: string;
  quantity: string;
  taker_user_id: number;
  maker_user_id: number;
  created_at: string;
  side?: string;
}

interface PortfolioData {
  wallets: WalletData[];
  open_orders: Order[];
  recent_trades: Trade[];
}

export default function Portfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders/portfolio');
      setPortfolio(res.data);
    } catch (error: any) {
      console.error('Failed to load portfolio:', error);
      toast.error(error.response?.data?.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Order cancelled successfully');
      loadPortfolio();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-dark-300">Loading portfolio...</p>
      </div>
    );
  }

  const wallets = portfolio?.wallets || [];
  const openOrders = portfolio?.open_orders || [];
  const recentTrades = portfolio?.recent_trades || [];

  // Calculate total portfolio value (simplified - using USDT as base)
  const totalValue = wallets.reduce((sum, wallet) => {
    const total = parseFloat(wallet.balance_available) + parseFloat(wallet.balance_locked);
    // Simplified: assume 1:1 for non-USDT assets (would need real price feed)
    return sum + total;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Portfolio</h1>
        <button
          onClick={loadPortfolio}
          className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-white rounded-lg hover:bg-dark-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <Wallet className="w-5 h-5 text-primary-500" />
            </div>
            <h3 className="text-dark-300 text-sm">Total Balance</h3>
          </div>
          <p className="text-2xl font-bold text-white">{totalValue.toFixed(2)} USDT</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-dark-300 text-sm">Open Orders</h3>
          </div>
          <p className="text-2xl font-bold text-white">{openOrders.length}</p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-dark-300 text-sm">Recent Trades</h3>
          </div>
          <p className="text-2xl font-bold text-white">{recentTrades.length}</p>
        </div>
      </div>

      {/* Balances */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">Balances</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800">
                <th className="text-left p-4 text-dark-300 font-medium">Asset</th>
                <th className="text-right p-4 text-dark-300 font-medium">Available</th>
                <th className="text-right p-4 text-dark-300 font-medium">Locked</th>
                <th className="text-right p-4 text-dark-300 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-dark-400">
                    No wallet balances
                  </td>
                </tr>
              ) : (
                wallets.map((wallet) => {
                  const available = parseFloat(wallet.balance_available);
                  const locked = parseFloat(wallet.balance_locked);
                  const total = available + locked;

                  return (
                    <tr key={wallet.id} className="border-t border-dark-800 hover:bg-dark-800/50">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{wallet.asset.symbol}</span>
                          <span className="text-dark-400 text-sm">{wallet.asset.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-white">
                        {available.toFixed(wallet.asset.precision)}
                      </td>
                      <td className="p-4 text-right text-warning-500">
                        {locked.toFixed(wallet.asset.precision)}
                      </td>
                      <td className="p-4 text-right text-white font-medium">
                        {total.toFixed(wallet.asset.precision)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Orders */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">Open Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800">
                <th className="text-left p-4 text-dark-300 font-medium">Market</th>
                <th className="text-left p-4 text-dark-300 font-medium">Side</th>
                <th className="text-left p-4 text-dark-300 font-medium">Type</th>
                <th className="text-right p-4 text-dark-300 font-medium">Price</th>
                <th className="text-right p-4 text-dark-300 font-medium">Quantity</th>
                <th className="text-right p-4 text-dark-300 font-medium">Filled</th>
                <th className="text-left p-4 text-dark-300 font-medium">Status</th>
                <th className="text-center p-4 text-dark-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {openOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-dark-400">
                    No open orders
                  </td>
                </tr>
              ) : (
                openOrders.map((order) => (
                  <tr key={order.id} className="border-t border-dark-800 hover:bg-dark-800/50">
                    <td className="p-4 text-white font-medium">{order.market}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.side === 'buy' 
                          ? 'bg-green-500/20 text-green-500' 
                          : 'bg-red-500/20 text-red-500'
                      }`}>
                        {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-dark-300 capitalize">{order.type}</td>
                    <td className="p-4 text-right text-white">
                      {order.price ? parseFloat(order.price).toFixed(2) : 'Market'}
                    </td>
                    <td className="p-4 text-right text-white">{order.quantity}</td>
                    <td className="p-4 text-right text-dark-300">
                      {order.quantity_filled} / {order.quantity}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.status === 'open' 
                          ? 'bg-blue-500/20 text-blue-500'
                          : order.status === 'partially_filled'
                          ? 'bg-warning-500/20 text-warning-500'
                          : order.status === 'filled'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-dark-600 text-dark-300'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        className="px-3 py-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trades */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-white">Recent Trades (Last 20)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-800">
                <th className="text-left p-4 text-dark-300 font-medium">Market</th>
                <th className="text-right p-4 text-dark-300 font-medium">Price</th>
                <th className="text-right p-4 text-dark-300 font-medium">Quantity</th>
                <th className="text-right p-4 text-dark-300 font-medium">Total</th>
                <th className="text-left p-4 text-dark-300 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-dark-400">
                    No trade history
                  </td>
                </tr>
              ) : (
                recentTrades.map((trade) => {
                  const price = parseFloat(trade.price);
                  const quantity = parseFloat(trade.quantity);
                  const total = price * quantity;

                  return (
                    <tr key={trade.id} className="border-t border-dark-800 hover:bg-dark-800/50">
                      <td className="p-4 text-white font-medium">{trade.market}</td>
                      <td className="p-4 text-right text-white">{price.toFixed(2)}</td>
                      <td className="p-4 text-right text-dark-300">{quantity.toFixed(8)}</td>
                      <td className="p-4 text-right text-white">{total.toFixed(2)}</td>
                      <td className="p-4 text-dark-300">
                        {new Date(trade.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}