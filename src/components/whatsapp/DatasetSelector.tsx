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
        if (!companyGroupId) {
          // Se não tem groupId, não mostrar datasets
          setAvailableDatasets([]);
          setLoading(false);
          return;
        }

        // Buscar relatórios do grupo para obter datasets já usados
        const reportsUrl = `/api/powerbi/reports?group_id=${companyGroupId}`;
        const reportsRes = await fetch(reportsUrl);
        const reportsData = await reportsRes.json();
        
        const reports = reportsData.reports || [];
        
        // Extrair datasets únicos dos relatórios (connection_id + dataset_id)
        const usedDatasetsMap = new Map<string, any>();
        
        reports.forEach((report: any) => {
          if (report.dataset_id && report.connection) {
            const key = `${report.connection_id}-${report.dataset_id}`;
            if (!usedDatasetsMap.has(key)) {
              usedDatasetsMap.set(key, {
                connection_id: report.connection_id,
                connection_name: report.connection.name || '',
                dataset_id: report.dataset_id,
                dataset_name: report.dataset_id // Nome será atualizado se possível
              });
            }
          }
        });

        const usedDatasets = Array.from(usedDatasetsMap.values());

        // Buscar nomes dos datasets do Power BI para melhorar a exibição
        const allDatasets: any[] = [];
        const connectionIds = [...new Set(usedDatasets.map(d => d.connection_id))];
        
        for (const connId of connectionIds) {
          try {
            const dsRes = await fetch(`/api/powerbi/datasets?connection_id=${connId}`);
            const dsData = await dsRes.json();
            
            // Criar mapa de datasets do Power BI
            const pbiDatasetsMap = new Map(
              (dsData.datasets || []).map((ds: any) => [ds.id, ds.name])
            );
            
            // Atualizar datasets usados com os nomes do Power BI
            usedDatasets
              .filter(d => d.connection_id === connId)
              .forEach(dataset => {
                const pbiName = pbiDatasetsMap.get(dataset.dataset_id);
                if (pbiName) {
                  dataset.dataset_name = pbiName;
                }
                allDatasets.push(dataset);
              });
          } catch (err) {
            console.error(`Erro ao buscar datasets da conexão ${connId}:`, err);
            // Mesmo com erro, adicionar o dataset usado (sem nome do Power BI)
            usedDatasets
              .filter(d => d.connection_id === connId)
              .forEach(dataset => {
                if (!allDatasets.find(d => d.connection_id === dataset.connection_id && d.dataset_id === dataset.dataset_id)) {
                  allDatasets.push(dataset);
                }
              });
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
