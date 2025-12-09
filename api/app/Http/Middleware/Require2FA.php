<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class Require2FA
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->has2FAEnabled()) {
            // 2FA is already enabled, allow through
            return $next($request);
        }

        // For certain sensitive operations, 2FA might be required
        // This middleware can be used to enforce 2FA for specific routes
        
        return $next($request);
    }
}
