<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Card extends Model
{
    use HasFactory;

    protected $fillable = [
        'deck_id',
        'front',
        'back',
        'explanation',
        'ease_factor',
        'interval',
        'repetitions',
        'due_at',
        'last_reviewed_at',
    ];

    protected $casts = [
        'ease_factor'      => 'float',
        'interval'         => 'integer',
        'repetitions'      => 'integer',
        'due_at'           => 'datetime',
        'last_reviewed_at' => 'datetime',
    ];

    public function deck(): BelongsTo
    {
        return $this->belongsTo(Deck::class);
    }

    public function reviewLogs(): HasMany
    {
        return $this->hasMany(ReviewLog::class);
    }

    public function isDue(): bool
    {
        return $this->due_at !== null && $this->due_at->isPast();
    }
}
