<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Web\DeckController;
use App\Http\Controllers\Web\Settings\AppearanceController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', fn() => redirect()->route('decks.index'))
    ->middleware('auth')
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

Route::middleware('auth')->group(function () {
    Route::resource('decks', DeckController::class);
    Route::patch('settings/appearance', [AppearanceController::class, 'update'])
        ->name('settings.appearance.update');
});

require __DIR__ . '/auth.php';
