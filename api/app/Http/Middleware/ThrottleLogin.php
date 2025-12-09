<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ThrottleLogin
{
    public function handle(Request $request, Closure $next): Response
    {
        $maxAttempts = config('app.rate_limit_login', 5);
        $decayMinutes = 1;

        $key = 'login:' . $request->ip();

        if (cache()->has($key) && cache()->get($key) >= $maxAttempts) {
            return response()->json([
                'message' => 'Too many login attempts. Please try again later.',
            ], 429);
        }

        cache()->put($key, (cache()->get($key, 0) + 1), now()->addMinutes($decayMinutes));

        return $next($request);
    }
}
