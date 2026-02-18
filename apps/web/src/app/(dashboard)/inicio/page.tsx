export default function InícioPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo ao Dashboard</h1>
        <p className="text-gray-600 mb-8">
          Gerencie seu pet shop e acompanhe todos os seus agendamentos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Agendamentos</h3>
            <p className="text-4xl font-bold text-blue-600">Em breve: métricas</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Receita</h3>
            <p className="text-4xl font-bold text-green-600">Em breve: métricas</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Avaliações</h3>
            <p className="text-4xl font-bold text-purple-600">Em breve: métricas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
