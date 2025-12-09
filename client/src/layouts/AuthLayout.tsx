import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">BinanceFlix</h1>
          <p className="text-dark-400">Secure Crypto Exchange Simulation</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
