'use client';

import { useState, useMemo } from 'react';
import { 
  Calculator, 
  Layers, 
  Filter, 
  X, 
  Plus, 
  Search,
  ChevronDown,
  ChevronRight,
  Code,
  Check
} from 'lucide-react';

interface Measure {
  name: string;
  label: string;
  description: string;
  category: string;
  categoryIcon: string;
}

interface SuggestedField {
  value: string;  // "Tabela.Coluna"
  label: string;
  icon: string;
  type: string;
}

interface Props {
  // Dados da API
  measures: Measure[];
  suggestedGroupers: SuggestedField[];
  suggestedFilters: SuggestedField[];
  
  // Estado (controlled component)
  selectedMeasures: string[];
  selectedGroupers: string[];  // Array de "Tabela.Coluna"
  selectedFilters: Array<{ column: string; value: string }>;
  
  // Callbacks
  onMeasuresChange: (measures: string[]) => void;
  onGroupersChange: (groupers: string[]) => void;
  onFiltersChange: (filters: Array<{ column: string; value: string }>) => void;
}

export function TrainingFieldSelector({
  measures,
  suggestedGroupers,
  suggestedFilters,
  selectedMeasures,
  selectedGroupers,
  selectedFilters,
  onMeasuresChange,
  onGroupersChange,
  onFiltersChange
}: Props) {
  const [showMeasureDropdown, setShowMeasureDropdown] = useState(false);
  const [measureSearch, setMeasureSearch] = useState('');
  const [showManualMeasureInput, setShowManualMeasureInput] = useState(false);
  const [manualMeasureInput, setManualMeasureInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Vendas', 'Produtos']);
  
  const [grouperInput, setGrouperInput] = useState('');
  const [showGrouperSuggestions, setShowGrouperSuggestions] = useState(false);
  
  const [filterColumnInput, setFilterColumnInput] = useState('');
  const [filterValueInput, setFilterValueInput] = useState('');
  const [showFilterSuggestions, setShowFilterSuggestions] = useState(false);

  // Agrupar medidas por categoria
  const measuresByCategory = useMemo(() => {
    const grouped: Record<string, Measure[]> = {};
    measures.forEach(measure => {
      if (!grouped[measure.category]) {
        grouped[measure.category] = [];
      }
      grouped[measure.category].push(measure);
    });
    return grouped;
  }, [measures]);

  // Filtrar medidas por busca
  const filteredMeasures = useMemo(() => {
    if (!measureSearch) return measures;
    const search = measureSearch.toLowerCase();
    return measures.filter(m => 
      m.name.toLowerCase().includes(search) ||
      m.label.toLowerCase().includes(search) ||
      m.description.toLowerCase().includes(search)
    );
  }, [measures, measureSearch]);

  // Filtrar sugestões de agrupadores
  const filteredGrouperSuggestions = useMemo(() => {
    if (!grouperInput) return suggestedGroupers.slice(0, 10);
    const search = grouperInput.toLowerCase();
    return suggestedGroupers.filter(g => 
      g.value.toLowerCase().includes(search) ||
      g.label.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [suggestedGroupers, grouperInput]);

  // Filtrar sugestões de filtros
  const filteredFilterSuggestions = useMemo(() => {
    if (!filterColumnInput) return suggestedFilters.slice(0, 10);
    const search = filterColumnInput.toLowerCase();
    return suggestedFilters.filter(f => 
      f.value.toLowerCase().includes(search) ||
      f.label.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [suggestedFilters, filterColumnInput]);

  // Função para converter Tabela.Coluna para DAX
  function toDAXColumn(tableColumn: string): string {
    const [table, column] = tableColumn.split('.');
    if (!table || !column) return tableColumn;
    return `'${table}'[${column}]`;
  }

  // Função para gerar preview do DAX
  const daxPreview = useMemo(() => {
    const parts: string[] = [];
    
    if (selectedMeasures.length > 0) {
      parts.push(`Medidas: ${selectedMeasures.map(m => `[${m}]`).join(', ')}`);
    }
    
    if (selectedGroupers.length > 0) {
      parts.push(`Agrupar por: ${selectedGroupers.map(toDAXColumn).join(', ')}`);
    }
    
    if (selectedFilters.length > 0) {
      const filterLines = selectedFilters.map(f => {
        const daxCol = toDAXColumn(f.column);
        return `         ${daxCol} = "${f.value}"`;
      });
      parts.push(`Filtros:\n${filterLines.join('\n')}`);
    }
    
    return parts.length > 0 ? parts.join('\n') : 'Nenhuma seleção ainda';
  }, [selectedMeasures, selectedGroupers, selectedFilters]);

  function toggleCategory(category: string) {
    setExpandedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }

  function addMeasure(measureName: string) {
    if (!selectedMeasures.includes(measureName)) {
      onMeasuresChange([...selectedMeasures, measureName]);
    }
    setShowMeasureDropdown(false);
    setMeasureSearch('');
  }

  function addManualMeasure() {
    if (manualMeasureInput.trim() && !selectedMeasures.includes(manualMeasureInput.trim())) {
      onMeasuresChange([...selectedMeasures, manualMeasureInput.trim()]);
      setManualMeasureInput('');
      setShowManualMeasureInput(false);
    }
  }

  function removeMeasure(measureName: string) {
    onMeasuresChange(selectedMeasures.filter(m => m !== measureName));
  }

  function handleGrouperKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && grouperInput.trim()) {
      const value = grouperInput.trim();
      if (!selectedGroupers.includes(value)) {
        onGroupersChange([...selectedGroupers, value]);
      }
      setGrouperInput('');
      setShowGrouperSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowGrouperSuggestions(false);
    }
  }

  function addGrouperFromSuggestion(suggestion: SuggestedField) {
    if (!selectedGroupers.includes(suggestion.value)) {
      onGroupersChange([...selectedGroupers, suggestion.value]);
    }
    setGrouperInput('');
    setShowGrouperSuggestions(false);
  }

  function removeGrouper(grouper: string) {
    onGroupersChange(selectedGroupers.filter(g => g !== grouper));
  }

  function addFilter() {
    if (filterColumnInput.trim() && filterValueInput.trim()) {
      const newFilter = {
        column: filterColumnInput.trim(),
        value: filterValueInput.trim()
      };
      
      // Verificar se já existe
      const exists = selectedFilters.some(f => 
        f.column === newFilter.column && f.value === newFilter.value
      );
      
      if (!exists) {
        onFiltersChange([...selectedFilters, newFilter]);
      }
      
      setFilterColumnInput('');
      setFilterValueInput('');
      setShowFilterSuggestions(false);
    }
  }

  function addFilterFromSuggestion(suggestion: SuggestedField) {
    setFilterColumnInput(suggestion.value);
    setShowFilterSuggestions(false);
  }

  function removeFilter(index: number) {
    onFiltersChange(selectedFilters.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      {/* Primeira linha: Medidas */}
      <div className="grid grid-cols-1 gap-4 items-stretch">
        {/* CARD 1: MEDIDAS */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Medidas</h3>
            <span className="text-sm text-gray-500">({selectedMeasures.length} selecionadas)</span>
          </div>

          {/* Medidas selecionadas */}
          {selectedMeasures.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedMeasures.map(measure => (
                <span
                  key={measure}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {measure}
                  <button
                    onClick={() => removeMeasure(measure)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input de medida com botão + */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={showManualMeasureInput ? manualMeasureInput : measureSearch}
                onChange={(e) => {
                  if (showManualMeasureInput) {
                    setManualMeasureInput(e.target.value);
                  } else {
                    setMeasureSearch(e.target.value);
                  }
                }}
                onFocus={() => {
                  if (!showManualMeasureInput) {
                    setShowMeasureDropdown(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (showManualMeasureInput) {
                    if (e.key === 'Enter') {
                      addManualMeasure();
                    } else if (e.key === 'Escape') {
                      setShowManualMeasureInput(false);
                      setManualMeasureInput('');
                    }
                  }
                }}
                placeholder={showManualMeasureInput ? "Digite o nome da medida" : "Buscar medida..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {!showManualMeasureInput && (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              )}
            </div>
            <button
              onClick={() => {
                if (showManualMeasureInput) {
                  addManualMeasure();
                } else {
                  setShowManualMeasureInput(true);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center text-sm"
              title={showManualMeasureInput ? "Adicionar medida manual" : "Adicionar medida manual"}
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Dropdown de medidas */}
          {showMeasureDropdown && !showManualMeasureInput && (
            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {Object.entries(measuresByCategory).map(([category, categoryMeasures]) => {
                const isExpanded = expandedCategories.includes(category);
                const displayMeasures = measureSearch 
                  ? filteredMeasures.filter(m => m.category === category)
                  : categoryMeasures;

                if (displayMeasures.length === 0) return null;

                return (
                  <div key={category} className="border-b border-gray-100 last:border-b-0">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span>{categoryMeasures[0]?.categoryIcon || '📊'}</span>
                        <span className="font-medium text-gray-900">{category}</span>
                        <span className="text-xs text-gray-500">({displayMeasures.length})</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={16} className="text-gray-400" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="bg-gray-50">
                        {displayMeasures.map(measure => (
                          <button
                            key={measure.name}
                            onClick={() => addMeasure(measure.name)}
                            disabled={selectedMeasures.includes(measure.name)}
                            className="w-full px-6 py-2 text-left hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between text-sm"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{measure.name}</div>
                              <div className="text-xs text-gray-500">{measure.description}</div>
                            </div>
                            {selectedMeasures.includes(measure.name) && (
                              <Check size={16} className="text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Segunda linha: Agrupar Por */}
      <div className="grid grid-cols-1 gap-4 items-stretch">
        {/* CARD 2: AGRUPAR POR */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Agrupar Por</h3>
            <span className="text-sm text-gray-500">({selectedGroupers.length} selecionados)</span>
          </div>

          {/* Agrupadores selecionados */}
          {selectedGroupers.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedGroupers.map(grouper => (
                <span
                  key={grouper}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {grouper}
                  <button
                    onClick={() => removeGrouper(grouper)}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input de agrupador com botão + */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={grouperInput}
                onChange={(e) => {
                  setGrouperInput(e.target.value);
                  setShowGrouperSuggestions(true);
                }}
                onKeyDown={handleGrouperKeyDown}
                onFocus={() => setShowGrouperSuggestions(true)}
                onBlur={() => setTimeout(() => setShowGrouperSuggestions(false), 200)}
                placeholder="Digite Tabela.Coluna"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
              
              {/* Sugestões */}
              {showGrouperSuggestions && filteredGrouperSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredGrouperSuggestions.map(suggestion => (
                    <button
                      key={suggestion.value}
                      onClick={() => addGrouperFromSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <span>{suggestion.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{suggestion.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{suggestion.value}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (grouperInput.trim() && !selectedGroupers.includes(grouperInput.trim())) {
                  onGroupersChange([...selectedGroupers, grouperInput.trim()]);
                  setGrouperInput('');
                }
              }}
              disabled={!grouperInput.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
              title="Adicionar agrupador"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Terceira linha: Filtros */}
      <div className="grid grid-cols-1 gap-4 items-stretch">
        {/* CARD 3: FILTROS */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
            <span className="text-sm text-gray-500">({selectedFilters.length} selecionados)</span>
          </div>

          {/* Filtros selecionados */}
          {selectedFilters.length > 0 && (
            <div className="space-y-2 mb-4">
              {selectedFilters.map((filter, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg"
                >
                  <span className="flex-1 text-sm">
                    <span className="font-mono text-purple-800">{filter.column}</span>
                    <span className="text-purple-600 mx-2">=</span>
                    <span className="text-purple-800">&quot;{filter.value}&quot;</span>
                  </span>
                  <button
                    onClick={() => removeFilter(index)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Inputs de filtro */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="text"
                value={filterColumnInput}
                onChange={(e) => {
                  setFilterColumnInput(e.target.value);
                  setShowFilterSuggestions(true);
                }}
                onFocus={() => setShowFilterSuggestions(true)}
                onBlur={() => setTimeout(() => setShowFilterSuggestions(false), 200)}
                placeholder="Tabela.Coluna"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              
              {/* Sugestões */}
              {showFilterSuggestions && filteredFilterSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredFilterSuggestions.map(suggestion => (
                    <button
                      key={suggestion.value}
                      onClick={() => addFilterFromSuggestion(suggestion)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <span>{suggestion.icon}</span>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{suggestion.label}</div>
                        <div className="text-xs text-gray-500 font-mono">{suggestion.value}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={filterValueInput}
                onChange={(e) => setFilterValueInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addFilter();
                  }
                }}
                placeholder="Valor"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
              />
              <button
                onClick={addFilter}
                disabled={!filterColumnInput.trim() || !filterValueInput.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Função para gerar preview do DAX (exportada para uso na página principal)
export function generateDaxPreview(
  selectedMeasures: string[],
  selectedGroupers: string[],
  selectedFilters: Array<{ column: string; value: string }>
): string {
  const parts: string[] = [];
  
  function toDAXColumn(tableColumn: string): string {
    const [table, column] = tableColumn.split('.');
    if (!table || !column) return tableColumn;
    return `'${table}'[${column}]`;
  }
  
  if (selectedMeasures.length > 0) {
    parts.push(`Medidas: ${selectedMeasures.map(m => `[${m}]`).join(', ')}`);
  }
  
  if (selectedGroupers.length > 0) {
    parts.push(`Agrupar por: ${selectedGroupers.map(toDAXColumn).join(', ')}`);
  }
  
  if (selectedFilters.length > 0) {
    const filterLines = selectedFilters.map(f => {
      const daxCol = toDAXColumn(f.column);
      return `         ${daxCol} = "${f.value}"`;
    });
    parts.push(`Filtros:\n${filterLines.join('\n')}`);
  }
  
  return parts.length > 0 ? parts.join('\n') : 'Nenhuma seleção ainda';
}
