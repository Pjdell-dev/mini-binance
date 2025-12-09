<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ThrottleOtp
{
    public function handle(Request $request, Closure $next): Response
    {
        $maxAttempts = config('app.rate_limit_otp', 3);
        $decayMinutes = 5;

        $key = 'otp:' . $request->ip() . ':' . ($request->user()?->id ?? 'guest');

        if (cache()->has($key) && cache()->get($key) >= $maxAttempts) {
            return response()->json([
                'message' => 'Too many verification attempts. Please try again later.',
            ], 429);
        }

        cache()->put($key, (cache()->get($key, 0) + 1), now()->addMinutes($decayMinutes));

        return $next($request);
    }
}
