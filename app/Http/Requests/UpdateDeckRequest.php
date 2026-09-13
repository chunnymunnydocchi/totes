<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDeckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9-]+:[a-z0-9-]+$/i'],
            'color' => ['required', 'string', Rule::in([
                'blue',
                'purple',
                'green',
                'amber',
                'rose',
                'teal',
                'indigo',
                'slate',
            ])],
            'shuffle_default' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'shuffle_default' => $this->boolean('shuffle_default'),
        ]);
    }
}
