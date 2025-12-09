import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface OrderBookEntry {
  price: string;
  quantity: string;
  total: string;
}

interface Trade {
  id: number;
  price: string;
  quantity: string;
  side: 'buy' | 'sell';
  created_at: string;
}

interface Ticker {
  last_price: string;
  change_24h: string;
  high_24h: string;
  low_24h: string;
  volume_24h: string;
}

export default function Trading() {
  const [selectedPair, setSelectedPair] = useState('BTC/USDT');
  const [orderType, setOrderType] = useState<'limit' | 'market'>('limit');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({
    bids: [],
    asks: []
  });
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [ticker, setTicker] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(false);

  const pairs = ['BTC/USDT', 'ETH/USDT', 'ETH/BTC'];

  useEffect(() => {
    loadMarketData();
    const interval = setInterval(loadMarketData, 3000);
    return () => clearInterval(interval);
  }, [selectedPair]);

  const loadMarketData = async () => {
    try {
      const [base, quote] = selectedPair.split('/');
      const [orderbookRes, tradesRes, tickerRes] = await Promise.all([
        api.get(`/market/orderbook/${base}/${quote}`),
        api.get(`/market/trades/${base}/${quote}`),
        api.get(`/market/ticker/${base}/${quote}`)
      ]);
      setOrderBook(orderbookRes.data.orderbook || { bids: [], asks: [] });
      setRecentTrades(tradesRes.data.trades || []);
      setTicker(tickerRes.data.ticker || null);
    } catch (error: any) {
      console.error('Failed to load market data:', error);
      setOrderBook({ bids: [], asks: [] });
      setRecentTrades([]);
      setTicker(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [base, quote] = selectedPair.split('/');
      await api.post('/orders', {
        market: `${base}-${quote}`,
        side: orderSide,
        type: orderType,
        price: orderType === 'limit' ? price : null,
        quantity
      });
      toast.success(`${orderSide.toUpperCase()} order placed successfully`);
      setPrice('');
      setQuantity('');
      loadMarketData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const total = orderType === 'limit' && price && quantity 
    ? (parseFloat(price) * parseFloat(quantity)).toFixed(8) 
    : '0.00';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{selectedPair}</h1>
          {ticker && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-2xl font-bold text-white">${ticker.last_price}</span>
              <span className={`flex items-center gap-1 ${parseFloat(ticker.change_24h) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                {parseFloat(ticker.change_24h) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {ticker.change_24h}%
              </span>
              <span className="text-dark-300">24h High: <span className="text-white">${ticker.high_24h}</span></span>
              <span className="text-dark-300">24h Low: <span className="text-white">${ticker.low_24h}</span></span>
              <span className="text-dark-300">24h Volume: <span className="text-white">{ticker.volume_24h}</span></span>
            </div>
          )}
        </div>
        <select 
          value={selectedPair} 
          onChange={(e) => setSelectedPair(e.target.value)}
          className="input w-48"
        >
          {pairs.map(pair => (
            <option key={pair} value={pair}>{pair}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Book */}
        <div className="card lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Order Book</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-3 text-xs text-dark-300 font-medium mb-2">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Total</span>
            </div>
            {/* Asks (Sell Orders) */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {orderBook?.asks && orderBook.asks.length > 0 ? orderBook.asks.slice().reverse().map((ask, idx) => (
                <div key={idx} className="grid grid-cols-3 text-xs hover:bg-dark-700 cursor-pointer p-1 rounded">
                  <span className="text-danger-400 font-mono">{parseFloat(ask.price).toFixed(2)}</span>
                  <span className="text-white text-right font-mono">{parseFloat(ask.quantity).toFixed(8)}</span>
                  <span className="text-dark-300 text-right font-mono">{parseFloat(ask.total).toFixed(2)}</span>
                </div>
              )) : (
                <div className="text-center text-dark-300 py-4 text-xs">No sell orders</div>
              )}
            </div>
            {/* Current Price */}
            {ticker && (
              <div className="text-center py-2 border-y border-dark-600">
                <span className={`text-lg font-bold ${parseFloat(ticker.change_24h) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  ${ticker.last_price}
                </span>
              </div>
            )}
            {/* Bids (Buy Orders) */}
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {orderBook?.bids && orderBook.bids.length > 0 ? orderBook.bids.map((bid, idx) => (
                <div key={idx} className="grid grid-cols-3 text-xs hover:bg-dark-700 cursor-pointer p-1 rounded">
                  <span className="text-success-400 font-mono">{parseFloat(bid.price).toFixed(2)}</span>
                  <span className="text-white text-right font-mono">{parseFloat(bid.quantity).toFixed(8)}</span>
                  <span className="text-dark-300 text-right font-mono">{parseFloat(bid.total).toFixed(2)}</span>
                </div>
              )) : (
                <div className="text-center text-dark-300 py-4 text-xs">No buy orders</div>
              )}
            </div>
          </div>
        </div>

        {/* Trading Form */}
        <div className="card lg:col-span-1">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderSide('buy')}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                orderSide === 'buy' ? 'bg-success-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              BUY
            </button>
            <button
              onClick={() => setOrderSide('sell')}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                orderSide === 'sell' ? 'bg-danger-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              SELL
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setOrderType('limit')}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition ${
                orderType === 'limit' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Limit
            </button>
            <button
              onClick={() => setOrderType('market')}
              className={`flex-1 py-2 px-4 rounded text-sm font-medium transition ${
                orderType === 'market' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              Market
            </button>
          </div>

          <form onSubmit={handlePlaceOrder} className="space-y-4">
            {orderType === 'limit' && (
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="input"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">Amount</label>
              <input
                type="number"
                step="0.00000001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0.00000000"
                className="input"
                required
              />
            </div>
            {orderType === 'limit' && (
              <div className="flex justify-between text-sm">
                <span className="text-dark-300">Total</span>
                <span className="text-white font-mono">{total} {selectedPair.split('/')[1]}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className={`w-full btn ${orderSide === 'buy' ? 'bg-success-500 hover:bg-success-600' : 'bg-danger-500 hover:bg-danger-600'} text-white`}
            >
              {loading ? 'Placing Order...' : `${orderSide.toUpperCase()} ${selectedPair.split('/')[0]}`}
            </button>
          </form>
        </div>

        {/* Recent Trades */}
        <div className="card lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-3 text-xs text-dark-300 font-medium mb-2">
              <span>Price</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Time</span>
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {recentTrades && recentTrades.length > 0 ? recentTrades.map((trade) => (
                <div key={trade.id} className="grid grid-cols-3 text-xs hover:bg-dark-700 p-1 rounded">
                  <span className={`font-mono ${trade.side === 'buy' ? 'text-success-400' : 'text-danger-400'}`}>
                    {parseFloat(trade.price).toFixed(2)}
                  </span>
                  <span className="text-white text-right font-mono">{parseFloat(trade.quantity).toFixed(8)}</span>
                  <span className="text-dark-300 text-right">{new Date(trade.created_at).toLocaleTimeString()}</span>
                </div>
              )) : (
                <div className="text-center text-dark-300 py-4 text-xs">No recent trades</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}