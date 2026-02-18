#!/bin/bash

# Script para gerar types TypeScript do Supabase
# Usage: ./supabase/generate-types.sh YOUR_PROJECT_ID

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID é obrigatório"
    echo "Usage: ./supabase/generate-types.sh YOUR_PROJECT_ID"
    echo ""
    echo "Encontre seu Project ID em:"
    echo "1. Supabase Dashboard → Settings → General"
    echo "2. URL da forma: https://{PROJECT_ID}.supabase.co"
    exit 1
fi

echo "🔄 Gerando types para project: $PROJECT_ID"

npx supabase gen types typescript --project-id $PROJECT_ID > packages/shared/src/types/database.ts

if [ $? -eq 0 ]; then
    echo "✅ Types gerados com sucesso!"
    echo "📍 Arquivo: packages/shared/src/types/database.ts"
else
    echo "❌ Erro ao gerar types"
    exit 1
fi
