<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiUsageLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'operation',
        'input_chars',
        'output_tokens',
    ];

    protected $casts = [
        'input_chars'   => 'integer',
        'output_tokens' => 'integer',
        'created_at'    => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
