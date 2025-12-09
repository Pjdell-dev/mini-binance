import { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Order {
  id: number;
  base_asset_symbol: string;
  quote_asset_symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price: string | null;
  quantity: string;
  quantity_filled: string;
  status: 'open' | 'partially_filled' | 'filled' | 'cancelled';
  created_at: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'filled' | 'cancelled'>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [openRes, historyRes] = await Promise.all([
        api.get('/orders/open'),
        api.get('/orders/history')
      ]);

      // Extract open orders
      const openOrders = Array.isArray(openRes.data?.data) ? openRes.data.data :
        Array.isArray(openRes.data) ? openRes.data : [];

      // Extract history orders - handle pagination
      let historyOrders = [];
      if (historyRes.data?.data?.data) {
        // Paginated response with data.data.data structure
        historyOrders = Array.isArray(historyRes.data.data.data) ? historyRes.data.data.data : [];
      } else if (Array.isArray(historyRes.data?.data)) {
        // Direct data array
        historyOrders = historyRes.data.data;
      } else if (Array.isArray(historyRes.data)) {
        historyOrders = historyRes.data;
      }

      const allOrders = [...openOrders, ...historyOrders];
      setOrders(allOrders);
    } catch (error: any) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await api.delete(`/orders/${orderId}`);
      toast.success('Order cancelled');
      loadOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    if (filter === 'open') return order.status === 'open' || order.status === 'partially_filled';
    return order.status === filter;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-dark-300">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Orders</h1>
        <button onClick={loadOrders} className="btn-secondary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'open', 'filled', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${filter === f ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="card">
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-600">
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Pair</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Side</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">Price</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-dark-300">Filled</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-dark-300">Time</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-dark-300">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-dark-700 hover:bg-dark-700">
                    <td className="py-3 px-4 text-white font-medium">{order.base_asset_symbol}/{order.quote_asset_symbol}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-1 rounded bg-dark-600 text-dark-300 uppercase">
                        {order.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded uppercase font-medium ${order.side === 'buy' ? 'bg-success-500/20 text-success-400' : 'bg-danger-500/20 text-danger-400'
                        }`}>
                        {order.side}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono">
                      {order.price ? parseFloat(order.price).toFixed(2) : 'Market'}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono">{parseFloat(order.quantity).toFixed(8)}</td>
                    <td className="py-3 px-4 text-right text-warning-400 font-mono">{parseFloat(order.quantity_filled).toFixed(8)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-1 rounded uppercase ${order.status === 'filled' ? 'bg-success-500/20 text-success-400' :
                          order.status === 'cancelled' ? 'bg-dark-600 text-dark-400' :
                            'bg-warning-500/20 text-warning-400'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-dark-300 text-sm">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      {(order.status === 'open' || order.status === 'partially_filled') && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-danger-400 hover:text-danger-300 p-1"
                          title="Cancel Order"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-dark-300">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}