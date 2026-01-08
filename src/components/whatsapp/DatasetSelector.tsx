'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface Dataset {
  connection_id: string;
  dataset_id: string;
  dataset_name: string;
}

interface DatasetSelectorProps {
  companyGroupId?: string;
  selectedDatasets: Dataset[];
  onChange: (datasets: Dataset[]) => void;
  disabled?: boolean;
}

export default function DatasetSelector({ 
  companyGroupId, 
  selectedDatasets, 
  onChange,
  disabled = false 
}: DatasetSelectorProps) {
  const [availableDatasets, setAvailableDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDatasets() {
      setLoading(true);
      try {
        // Buscar conexões - passar company_group_id se existir
        const url = companyGroupId 
          ? `/api/powerbi/connections?company_group_id=${companyGroupId}`
          : '/api/powerbi/connections';
        
        const res = await fetch(url);
        const data = await res.json();
        
        let connections = data.connections || [];
        
        // Para cada conexão, buscar datasets
        const allDatasets: any[] = [];
        for (const conn of connections) {
          try {
            const dsRes = await fetch(`/api/powerbi/datasets?connection_id=${conn.id}`);
            const dsData = await dsRes.json();
            (dsData.datasets || []).forEach((ds: any) => {
              allDatasets.push({
                connection_id: conn.id,
                connection_name: conn.name,
                dataset_id: ds.id,
                dataset_name: ds.name
              });
            });
          } catch (err) {
            console.error(`Erro ao buscar datasets da conexão ${conn.id}:`, err);
          }
        }
        
        setAvailableDatasets(allDatasets);
      } catch (error) {
        console.error('Erro ao carregar datasets:', error);
      } finally {
        setLoading(false);
      }
    }
    loadDatasets();
  }, [companyGroupId]);

  const toggleDataset = (dataset: any) => {
    if (disabled) return;
    
    const exists = selectedDatasets.some(
      d => d.connection_id === dataset.connection_id && d.dataset_id === dataset.dataset_id
    );
    
    if (exists) {
      onChange(selectedDatasets.filter(
        d => !(d.connection_id === dataset.connection_id && d.dataset_id === dataset.dataset_id)
      ));
    } else {
      onChange([...selectedDatasets, {
        connection_id: dataset.connection_id,
        dataset_id: dataset.dataset_id,
        dataset_name: dataset.dataset_name
      }]);
    }
  };

  const isSelected = (dataset: any) => {
    return selectedDatasets.some(
      d => d.connection_id === dataset.connection_id && d.dataset_id === dataset.dataset_id
    );
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Carregando datasets...</span>
      </div>
    );
  }

  if (availableDatasets.length === 0) {
    return <div className="text-sm text-gray-500">Nenhum dataset disponível</div>;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Datasets Autorizados
      </label>
      <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-white">
        {availableDatasets.map((dataset, idx) => (
          <label 
            key={`${dataset.connection_id}-${dataset.dataset_id}`}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected(dataset)}
              onChange={() => toggleDataset(dataset)}
              disabled={disabled}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">{dataset.dataset_name}</div>
              <div className="text-xs text-gray-500 truncate">{dataset.connection_name}</div>
            </div>
          </label>
        ))}
      </div>
      {selectedDatasets.length > 0 && (
        <div className="text-sm text-gray-600">
          {selectedDatasets.length} dataset(s) selecionado(s)
        </div>
      )}
    </div>
  );
}
