<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deck extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'icon',
        'color',
        'shuffle_default',
    ];

    protected $casts = [
        'shuffle_default' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(Card::class);
    }
    public function dueCards(): HasMany
    {
        return $this->hasMany(Card::class)
            ->whereNotNull('due_at')
            ->where('due_at', '<=', now());
    }
}
