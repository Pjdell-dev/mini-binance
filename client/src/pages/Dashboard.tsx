import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';

interface WalletBalance {
  asset: string;
  available_balance: string;
  locked_balance: string;
  total_balance: string;
}

interface PortfolioData {
  total_value_usd: string;
  wallets: WalletBalance[];
}

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [portfolioRes] = await Promise.all([
        api.get('/orders/portfolio')
      ]);
      setPortfolio(portfolioRes.data.data);
    } catch (error: any) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-dark-300">Loading...</p></div>;
  }

  const totalValue = portfolio?.total_value_usd || '0.00';
  const nonZeroWallets = portfolio?.wallets.filter(w => parseFloat(w.total_balance) > 0) || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-300 mb-1">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-white">${parseFloat(totalValue).toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-300 mb-1">Assets</p>
              <p className="text-2xl font-bold text-white">{nonZeroWallets.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-success-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-300 mb-1">24h Change</p>
              <p className="text-2xl font-bold text-success-400">+0.00%</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-success-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success-400" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-300 mb-1">Active Orders</p>
              <p className="text-2xl font-bold text-white">0</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-warning-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-warning-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Your Assets</h2>
          <Link to="/wallets" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
            View All →
          </Link>
        </div>
        {nonZeroWallets.length > 0 ? (
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
                {nonZeroWallets.map((wallet) => (
                  <tr key={wallet.asset} className="border-b border-dark-700 hover:bg-dark-700">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                          <span className="text-primary-400 font-bold text-sm">{wallet.asset.substring(0, 2)}</span>
                        </div>
                        <span className="text-white font-medium">{wallet.asset}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono">{parseFloat(wallet.available_balance).toFixed(8)}</td>
                    <td className="py-3 px-4 text-right text-warning-400 font-mono">{parseFloat(wallet.locked_balance).toFixed(8)}</td>
                    <td className="py-3 px-4 text-right text-white font-bold font-mono">{parseFloat(wallet.total_balance).toFixed(8)}</td>
                    <td className="py-3 px-4 text-right">
                      <Link to="/trading" className="text-primary-400 hover:text-primary-300 text-sm font-medium">
                        Trade
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-300 mb-4">You don't have any assets yet</p>
            <Link to="/wallets" className="btn-primary">
              Deposit Funds
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/trading" className="card hover:border-primary-500 transition cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Start Trading</h3>
              <p className="text-sm text-dark-300">Buy and sell crypto assets</p>
            </div>
          </div>
        </Link>

        <Link to="/wallets" className="card hover:border-success-500 transition cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-success-500/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-success-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">Manage Wallets</h3>
              <p className="text-sm text-dark-300">Deposit and withdraw funds</p>
            </div>
          </div>
        </Link>

        <Link to="/orders" className="card hover:border-warning-500 transition cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-warning-500/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-warning-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1">View Orders</h3>
              <p className="text-sm text-dark-300">Track your open orders</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}