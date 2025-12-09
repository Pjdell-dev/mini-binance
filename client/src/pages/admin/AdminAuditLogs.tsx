import { useEffect, useState } from 'react';
import { Search, Filter, Calendar, User, FileText } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface AuditLog {
  id: number;
  actor_user_id: number;
  actor: {
    id: number;
    name: string;
    email: string;
  } | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs', {
        params: { page, per_page: 50 },
      });
      setLogs(res.data.logs?.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const getActionColor = (action: string) => {
    if (action.includes('login') || action.includes('register')) return 'text-blue-400';
    if (action.includes('approve') || action.includes('grant')) return 'text-green-400';
    if (action.includes('reject') || action.includes('freeze') || action.includes('revoke'))
      return 'text-red-400';
    if (action.includes('deposit') || action.includes('credit')) return 'text-green-400';
    if (action.includes('withdraw') || action.includes('debit')) return 'text-red-400';
    if (action.includes('order')) return 'text-yellow-400';
    return 'text-dark-300';
  };

  const getActionLabel = (action: string) => {
    return action
      .split('.')
      .pop()
      ?.split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter);

    return matchesSearch && matchesAction;
  });

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action.split('.')[0]))).sort();

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">Audit Logs</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300" size={20} />
          <input
            type="text"
            placeholder="Search by user or action..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Action Filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-300" size={20} />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white focus:outline-none focus:border-primary-500 appearance-none"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-dark-700 rounded-lg border border-dark-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-600 text-dark-300 text-sm">
                <th className="text-left p-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    Date & Time
                  </div>
                </th>
                <th className="text-left p-4">
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    User
                  </div>
                </th>
                <th className="text-left p-4">
                  <div className="flex items-center gap-2">
                    <FileText size={16} />
                    Action
                  </div>
                </th>
                <th className="text-left p-4">Entity</th>
                <th className="text-left p-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-600">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-dark-600/50">
                  <td className="p-4">
                    <div className="text-white text-sm">
                      {new Date(log.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-dark-300 text-xs">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-white font-medium">{log.actor?.name || 'System'}</div>
                    <div className="text-dark-300 text-sm">{log.actor?.email || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className={`font-medium ${getActionColor(log.action)}`}>
                      {getActionLabel(log.action)}
                    </div>
                    <div className="text-dark-400 text-xs font-mono">{log.action}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-white text-sm">
                      {log.target_type?.split('\\').pop() || 'N/A'}
                    </div>
                    <div className="text-dark-300 text-xs">ID: {log.target_id || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-white font-mono text-sm">{log.ip_address}</div>
                    <div className="text-dark-400 text-xs truncate max-w-xs" title={log.user_agent}>
                      {log.user_agent.substring(0, 40)}...
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12 text-dark-300">No audit logs found</div>
        )}
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-white">Page {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={logs.length < 50}
            className="px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="text-dark-300 text-sm mb-1">Total Logs</div>
          <div className="text-white text-2xl font-bold">{logs.length}</div>
        </div>

        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="text-dark-300 text-sm mb-1">Auth Events</div>
          <div className="text-blue-400 text-2xl font-bold">
            {logs.filter((l) => l.action.includes('auth')).length}
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="text-dark-300 text-sm mb-1">Admin Actions</div>
          <div className="text-yellow-400 text-2xl font-bold">
            {logs.filter((l) => l.action.includes('admin')).length}
          </div>
        </div>

        <div className="bg-dark-700 rounded-lg border border-dark-600 p-4">
          <div className="text-dark-300 text-sm mb-1">Transactions</div>
          <div className="text-green-400 text-2xl font-bold">
            {logs.filter((l) => l.action.includes('transaction') || l.action.includes('order')).length}
          </div>
        </div>
      </div>
    </div>
  );
}