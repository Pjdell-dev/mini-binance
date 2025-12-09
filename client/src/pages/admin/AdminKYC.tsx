import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, FileText, User, Home } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface KycDocument {
  id: number;
  user_id: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  doc_type: string;
  document_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  rejection_reason?: string;
  file_path: string;
  created_at: string;
  submitted_at?: string;
}

function DocumentViewer({ docId, filePath }: { docId: number; filePath: string }) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/admin/kyc/${docId}/document`, {
          responseType: 'blob',
        });
        const url = URL.createObjectURL(response.data);
        setImageUrl(url);
        setError(false);
      } catch (err) {
        console.error('Failed to load document:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [docId]);

  if (loading) {
    return (
      <div className="bg-black rounded-lg p-8 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-3"></div>
          <p className="text-dark-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="bg-black rounded-lg p-8 text-center text-dark-400 min-h-[300px] flex items-center justify-center">
        <div>
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Failed to load document preview</p>
          <p className="text-xs mt-2">The file may be corrupted or inaccessible</p>
        </div>
      </div>
    );
  }

  const isPdf = filePath.match(/\.pdf$/i);
  const isImage = filePath.match(/\.(jpg|jpeg|png|gif)$/i);

  return (
    <div className="bg-black rounded-lg overflow-hidden">
      {isPdf ? (
        <iframe
          src={imageUrl}
          className="w-full h-[500px] border-0"
          title="KYC Document PDF"
        />
      ) : isImage ? (
        <img
          src={imageUrl}
          alt="KYC Document"
          className="w-full h-auto max-h-[500px] object-contain"
        />
      ) : (
        <div className="p-8 text-center text-dark-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p>Preview not available for this file type</p>
        </div>
      )}
    </div>
  );
}

export default function AdminKYC() {
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KycDocument | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/kyc/documents', {
        params: { status: filter }
      });
      console.log('API Response:', res.data);
      // Handle Laravel pagination response
      const docs = res.data?.documents?.data ? res.data.documents.data : 
                   Array.isArray(res.data?.documents) ? res.data.documents : 
                   Array.isArray(res.data) ? res.data : [];
      console.log(`Fetched ${docs.length} documents for filter: ${filter}`, docs);
      setDocuments(docs);
    } catch (error: any) {
      console.error('KYC fetch error:', error);
      toast.error(error.response?.data?.message || 'Failed to load KYC documents');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  const handleApprove = async (docId: number) => {
    if (!confirm('Are you sure you want to approve this KYC document?')) return;

    setActionLoading(docId);
    try {
      await api.post(`/admin/kyc/${docId}/approve`);
      toast.success('KYC document approved successfully');
      fetchDocuments();
      setSelectedDoc(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to approve document');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (docId: number) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    setActionLoading(docId);
    try {
      await api.post(`/admin/kyc/${docId}/reject`, { reason });
      toast.success('KYC document rejected');
      fetchDocuments();
      setSelectedDoc(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reject document');
    } finally {
      setActionLoading(null);
    }
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'id':
        return <FileText size={18} />;
      case 'selfie':
        return <User size={18} />;
      case 'proof_of_address':
        return <Home size={18} />;
      default:
        return <FileText size={18} />;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'id':
        return 'ID Document';
      case 'selfie':
        return 'Selfie';
      case 'proof_of_address':
        return 'Proof of Address';
      default:
        return type;
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
      <h1 className="text-3xl font-bold text-white mb-6">KYC Management</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === status
                ? 'bg-primary-500 text-white'
                : 'bg-dark-600 text-dark-300 hover:bg-dark-500'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-dark-700 rounded-lg border border-dark-600 p-4 hover:border-primary-500 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-dark-300">
                {getDocumentIcon(doc.doc_type)}
                <span className="text-sm font-medium text-white">
                  {getDocumentTypeLabel(doc.doc_type)}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-xs ${
                  doc.status === 'pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : doc.status === 'approved'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {doc.status}
              </span>
            </div>

            <div className="mb-3">
              <div className="text-white font-medium">{doc.user?.name || 'Unknown User'}</div>
              <div className="text-dark-300 text-sm">{doc.user?.email || 'N/A'}</div>
            </div>

            <div className="text-dark-400 text-xs mb-3">
              Submitted: {new Date(doc.created_at).toLocaleDateString()}
            </div>

            {doc.notes && doc.status === 'rejected' && (
              <div className="text-red-400 text-xs mb-3 p-2 bg-red-500/10 rounded">
                Reason: {doc.notes}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDoc(doc)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-600 text-white rounded hover:bg-dark-500 text-sm"
              >
                <Eye size={14} />
                View
              </button>
              {doc.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleApprove(doc.id)}
                    disabled={actionLoading === doc.id}
                    className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50"
                    title="Approve"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={() => handleReject(doc.id)}
                    disabled={actionLoading === doc.id}
                    className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircle size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12 text-dark-300 bg-dark-700 rounded-lg border border-dark-600">
          No {filter !== 'all' && filter} KYC documents found
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDoc(null)}
        >
          <div
            className="bg-dark-700 rounded-lg border border-dark-600 max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-dark-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">
                  {getDocumentTypeLabel(selectedDoc.doc_type)}
                </h3>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-dark-300 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="text-dark-300">
                <div className="mb-2">
                  <span className="font-medium text-white">{selectedDoc.user?.name || 'Unknown User'}</span>
                  <span className="mx-2">•</span>
                  <span>{selectedDoc.user?.email || 'N/A'}</span>
                </div>
                <div className="text-sm">
                  Submitted: {new Date(selectedDoc.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Document Preview */}
              <div className="bg-dark-800 rounded-lg p-4 mb-4">
                <p className="text-dark-300 text-sm mb-4">Document Preview:</p>
                <DocumentViewer docId={selectedDoc.id} filePath={selectedDoc.file_path} />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-dark-400 text-xs">File: {selectedDoc.file_path}</p>
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.get(`/admin/kyc/${selectedDoc.id}/document`, {
                          responseType: 'blob',
                        });
                        const url = window.URL.createObjectURL(response.data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = selectedDoc.file_path.split('/').pop() || 'document';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (error) {
                        toast.error('Failed to download document');
                      }
                    }}
                    className="text-primary-400 hover:text-primary-300 text-sm flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download
                  </button>
                </div>
              </div>

              {selectedDoc.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedDoc.id)}
                    disabled={actionLoading === selectedDoc.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    <CheckCircle size={18} />
                    Approve Document
                  </button>
                  <button
                    onClick={() => handleReject(selectedDoc.id)}
                    disabled={actionLoading === selectedDoc.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    Reject Document
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}