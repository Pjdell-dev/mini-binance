<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\KycDocument;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KycController extends Controller
{
    public function submit(Request $request)
    {
        $request->validate([
            'doc_type' => ['required', 'in:passport,drivers_license,national_id,other'],
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'], // 5MB max
        ]);

        $user = $request->user();

        // Check if already has pending/approved KYC
        $existingKyc = KycDocument::where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        if ($existingKyc) {
            return response()->json([
                'message' => 'You already have a KYC document under review or approved.',
            ], 400);
        }

        $file = $request->file('document');
        $fileName = uniqid('kyc_') . '.' . $file->getClientOriginalExtension();
        $filePath = $file->storeAs('kyc', $fileName, 'local');

        $kycDocument = KycDocument::create([
            'user_id' => $user->id,
            'doc_type' => $request->doc_type,
            'file_path' => $filePath,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'status' => 'pending',
        ]);

        // Update user KYC status
        $user->update(['kyc_status' => 'pending']);

        AuditLog::log($user->id, 'kyc.submitted', KycDocument::class, $kycDocument->id);

        return response()->json([
            'message' => 'KYC document submitted successfully.',
            'kyc' => $kycDocument->makeHidden(['file_path']),
        ], 201);
    }

    public function status(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'kyc_status' => $user->kyc_status,
        ]);
    }

    public function documents(Request $request)
    {
        $user = $request->user();

        $documents = KycDocument::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->makeHidden(['file_path']);

        return response()->json(['documents' => $documents]);
    }
}
