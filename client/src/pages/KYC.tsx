import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface KycDocument {
  id: number;
  doc_type: string;
  file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes?: string;
  created_at: string;
  updated_at: string;
}

export default function KYC() {
  const [kycStatus, setKycStatus] = useState<string>('none');
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState<string>('passport');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    loadKycData();
  }, []);

  const loadKycData = async () => {
    try {
      setLoading(true);
      const [statusRes, docsRes] = await Promise.all([
        api.get('/kyc/status'),
        api.get('/kyc/documents')
      ]);
      
      setKycStatus(statusRes.data.kyc_status || 'none');
      setDocuments(docsRes.data.documents || []);
    } catch (error: any) {
      console.error('Failed to load KYC data:', error);
      toast.error('Failed to load KYC information');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, and PDF files are allowed');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('doc_type', docType);

      await api.post('/kyc/submit', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('KYC document submitted successfully');
      setSelectedFile(null);
      setDocType('passport');
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload KYC data
      loadKycData();
    } catch (error: any) {
      console.error('Failed to submit KYC:', error);
      toast.error(error.response?.data?.message || 'Failed to submit KYC document');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-dark-300">Loading KYC information...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-500 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Verified</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-warning-500/20 text-warning-500 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Pending Review</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-500 rounded-lg">
            <XCircle className="w-5 h-5" />
            <span className="font-medium">Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Not Submitted</span>
          </div>
        );
    }
  };

  const canUpload = kycStatus !== 'approved' && kycStatus !== 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">KYC Verification</h1>
        {getStatusBadge(kycStatus)}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h3 className="text-blue-500 font-semibold mb-1">Identity Verification Required</h3>
            <p className="text-dark-300 text-sm">
              To comply with regulations and ensure security, please upload a valid government-issued ID 
              document. Accepted formats: JPG, PNG, PDF (max 5MB). Your document will be reviewed by our 
              compliance team within 24-48 hours.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Form */}
      {canUpload && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Upload ID Document</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Document Type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                required
              >
                <option value="passport">Passport</option>
                <option value="drivers_license">Driver's License</option>
                <option value="national_id">National ID Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                Upload File (JPG, PNG, PDF - Max 5MB)
              </label>
              <div className="relative">
                <input
                  id="file-input"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  required
                />
                <label
                  htmlFor="file-input"
                  className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-dark-600 rounded-lg cursor-pointer hover:border-primary-500 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-dark-400 mx-auto mb-2" />
                    <p className="text-white font-medium mb-1">
                      {selectedFile ? selectedFile.name : 'Click to upload'}
                    </p>
                    <p className="text-dark-400 text-sm">
                      {selectedFile 
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                        : 'JPG, PNG or PDF up to 5MB'
                      }
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:bg-dark-700 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {uploading ? 'Uploading...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Document History */}
      {documents.length > 0 && (
        <div className="bg-dark-900 border border-dark-700 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-dark-700">
            <h2 className="text-xl font-semibold text-white">Submission History</h2>
          </div>
          <div className="divide-y divide-dark-700">
            {documents.map((doc) => (
              <div key={doc.id} className="p-6 hover:bg-dark-800/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-dark-800 rounded-lg">
                      <FileText className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">{doc.file_name}</h3>
                      <p className="text-dark-400 text-sm capitalize">
                        {doc.doc_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    doc.status === 'approved'
                      ? 'bg-green-500/20 text-green-500'
                      : doc.status === 'pending'
                      ? 'bg-warning-500/20 text-warning-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {doc.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="text-sm text-dark-300">
                  <p>Submitted: {new Date(doc.created_at).toLocaleString()}</p>
                  {doc.status !== 'pending' && (
                    <p>Reviewed: {new Date(doc.updated_at).toLocaleString()}</p>
                  )}
                </div>

                {doc.reviewer_notes && (
                  <div className="mt-3 p-3 bg-dark-800 rounded-lg">
                    <p className="text-sm text-dark-300">
                      <span className="font-medium text-white">Reviewer Notes:</span> {doc.reviewer_notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Messages */}
      {kycStatus === 'approved' && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <h3 className="text-green-500 font-semibold">Identity Verified</h3>
              <p className="text-dark-300 text-sm">
                Your identity has been successfully verified. You now have full access to all platform features.
              </p>
            </div>
          </div>
        </div>
      )}

      {kycStatus === 'pending' && (
        <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-warning-500" />
            <div>
              <h3 className="text-warning-500 font-semibold">Review in Progress</h3>
              <p className="text-dark-300 text-sm">
                Your document is currently being reviewed by our compliance team. This typically takes 24-48 hours. 
                You'll receive an email notification once the review is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {kycStatus === 'rejected' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="text-red-500 font-semibold">Verification Failed</h3>
              <p className="text-dark-300 text-sm">
                Your document was rejected. Please review the feedback above and submit a new document with the 
                required corrections.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}