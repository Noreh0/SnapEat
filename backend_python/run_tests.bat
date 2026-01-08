#!/bin/bash

echo "=========================================="
echo "  EXECUTANDO TESTES - SNAPEATS BACKEND"
echo "=========================================="
echo ""

# Instalar dependências de teste se necessário
pip install -q -r requirements_test.txt

# Limpar cache anterior
echo "🧹 Limpando cache de testes..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null
find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null
rm -rf htmlcov/ .coverage 2>/dev/null

echo ""
echo "🧪 Executando testes..."
echo ""

# Executar testes com cobertura
pytest -v \
    --cov=. \
    --cov-report=html \
    --cov-report=term-missing \
    --cov-report=xml \
    --cov-config=.coveragerc \
    --cov-fail-under=75 \
    -m "not slow"

# Capturar código de saída
TEST_EXIT_CODE=$?

echo ""
echo "=========================================="
echo "  RESULTADO DOS TESTES"
echo "=========================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ TODOS OS TESTES PASSARAM!"
    echo "✅ COBERTURA >= 75%"
    echo ""
    echo "📊 Relatório HTML gerado em: htmlcov/index.html"
    echo "📊 Relatório XML gerado em: coverage.xml"
else
    echo "❌ ALGUNS TESTES FALHARAM OU COBERTURA < 75%"
    echo ""
    echo "Por favor, verifique os erros acima."
fi

echo ""
echo "Para ver o relatório detalhado, abra:"
echo "  htmlcov/index.html"
echo ""

exit $TEST_EXIT_CODE