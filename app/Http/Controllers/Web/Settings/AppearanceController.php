<?php

namespace App\Http\Controllers\Web\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateAppearanceRequest;
use Illuminate\Http\RedirectResponse;

class AppearanceController extends Controller
{
    public function update(UpdateAppearanceRequest $request): RedirectResponse
    {
        $request->user()->update([
            'theme' => $request->validated('theme'),
        ]);

        return back();
    }
}
