'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Upload, MessageSquare, Database, Download } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import { parseDocumentation, getDocumentationStats, ParsedDocumentation } from '@/lib/assistente-ia/documentation-parser';
import { useToast } from '@/contexts/ToastContext';
import { useMenu } from '@/contexts/MenuContext';

interface Dataset {
  id: string;
  name: string;
  dataset_id?: string;
}

interface ContextInfo {
  id: string;
  dataset_id: string;
  context_type: 'chat' | 'dax';
  context_content?: string | null;
  section_medidas: any[];
  section_tabelas: any[];
  section_queries: any[];
  section_exemplos: any[];
  parsed_at: string;
  updated_at: string;
}

// Componente interno que usa o contexto
function ContextosContent() {
  const toast = useToast();
  const { activeGroup } = useMenu();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [contexts, setContexts] = useState<ContextInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContexts, setLoadingContexts] = useState(false);
  
  const [showHelp, setShowHelp] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showDaxModal, setShowDaxModal] = useState(false);
  
  // Chat modal state
  const [chatContent, setChatContent] = useState('');
  const [chatParsed, setChatParsed] = useState<ParsedDocumentation | null>(null);
  const [chatStats, setChatStats] = useState<any>(null);
  const [chatFileName, setChatFileName] = useState<string | null>(null);
  
  // DAX modal state
  const [daxContent, setDaxContent] = useState('');
  const [daxParsed, setDaxParsed] = useState<any>(null);
  const [daxFileName, setDaxFileName] = useState<string | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const daxFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDatasets();
  }, [activeGroup?.id]);

  useEffect(() => {
    if (selectedDataset) {
      loadContexts();
    }
  }, [selectedDataset, activeGroup?.id]);

  useEffect(() => {
    if (chatContent.trim()) {
      const result = parseDocumentation(chatContent);
      setChatParsed(result);
      setChatStats(getDocumentationStats(result));
    } else {
      setChatParsed(null);
      setChatStats(null);
    }
  }, [chatContent]);

  useEffect(() => {
    if (daxContent.trim()) {
      try {
        const parsed = JSON.parse(daxContent);
        setDaxParsed(parsed);
      } catch {
        setDaxParsed(null);
      }
    } else {
      setDaxParsed(null);
    }
  }, [daxContent]);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      let groupId = activeGroup?.id;
      // Quando activeGroup é null (ex: Master ou ainda não carregou), buscar primeiro grupo
      if (!groupId) {
        const groupsRes = await fetch('/api/user/groups');
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groups = groupsData.groups || [];
          if (groups.length > 0) {
            groupId = groups[0].id;
          }
        }
      }
      const url = groupId
        ? `/api/assistente-ia/datasets?group_id=${groupId}`
        : '/api/assistente-ia/datasets';
      
      const res = await fetch(url);
      const data = await res.json();
      const datasetsList = Array.isArray(data?.data) ? data.data : Array.isArray(data?.datasets) ? data.datasets : Array.isArray(data) ? data : [];
      setDatasets(datasetsList);
      
      // Se o dataset selecionado não está mais na lista, limpar seleção
      if (selectedDataset && !datasetsList.find((ds: Dataset) => (ds.dataset_id || ds.id) === selectedDataset)) {
        setSelectedDataset('');
        setContexts([]);
      }
      
      // Se não tem dataset selecionado e há datasets disponíveis, selecionar o primeiro
      if (!selectedDataset && datasetsList.length > 0) {
        setSelectedDataset(datasetsList[0].dataset_id || datasetsList[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar datasets:', error);
      toast.error('Erro ao carregar datasets');
    } finally {
      setLoading(false);
    }
  };

  const loadContexts = async () => {
    if (!selectedDataset) return;
    setLoadingContexts(true);
    try {
      const groupParam = activeGroup?.id ? `&group_id=${activeGroup.id}` : '';
      const res = await fetch(`/api/assistente-ia/context?datasetId=${selectedDataset}${groupParam}`);
      const data = await res.json();
      setContexts(data.contexts || []);
    } catch (error) {
      console.error('Erro ao carregar contextos:', error);
    } finally {
      setLoadingContexts(false);
    }
  };

  const handleDownload = (fileName: string) => {
    const link = document.createElement('a');
    link.href = `/prompts/${fileName}`;
    link.download = fileName;
    link.click();
  };

  const getDatasetName = () => {
    const ds = datasets.find((d) => (d.dataset_id || d.id) === selectedDataset);
    return ds?.name?.replace(/\s+/g, '-').toLowerCase() || 'modelo';
  };

  const handleDownloadContext = async (ctx: ContextInfo) => {
    let content = ctx.context_content;

    // context_content não vem na listagem (performance), buscar sob demanda pelo ID
    if (!content) {
      try {
        const res = await fetch(`/api/assistente-ia/context?id=${ctx.id}${activeGroup?.id ? `&group_id=${activeGroup.id}` : ''}`);
        const data = await res.json();
        content = data.context?.context_content || data.contexts?.[0]?.context_content;
      } catch (error) {
        console.error('Erro ao buscar conteúdo para download:', error);
      }
    }

    if (!content) {
      toast.error('Conteúdo do contexto não disponível para download');
      return;
    }

    const baseName = getDatasetName();
    const isChat = ctx.context_type === 'chat';
    const fileName = `contexto-${isChat ? 'chat' : 'dax'}-${baseName}.${isChat ? 'md' : 'json'}`;
    let blobContent: string;
    if (isChat) {
      blobContent = content;
    } else {
      try {
        blobContent = JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        blobContent = content;
      }
    }
    const blob = new Blob([blobContent], { type: isChat ? 'text/markdown' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Download: ${fileName}`);
  };

  const handleFileImport = (file: File, type: 'chat' | 'dax') => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (type === 'chat') {
        setChatContent(content);
        setChatFileName(file.name);
      } else {
        setDaxContent(content);
        setDaxFileName(file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent, type: 'chat' | 'dax') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileImport(e.dataTransfer.files[0], type);
    }
  };

  const handleSaveChat = async () => {
    if (!chatParsed || chatParsed.errors.length > 0 || !selectedDataset) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/assistente-ia/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: selectedDataset,
          contextType: 'chat',
          content: chatContent,
          sections: {
            base: chatParsed.base,
            medidas: chatParsed.medidas,
            tabelas: chatParsed.tabelas,
            queries: chatParsed.queries,
            exemplos: chatParsed.exemplos
          },
          group_id: activeGroup?.id
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowChatModal(false);
        setChatContent('');
        setChatFileName(null);
        setChatParsed(null);
        setChatStats(null);
        loadContexts();
        toast.success('Documentação salva com sucesso!');
      } else {
        toast.error('Erro: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar documentação');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDax = async () => {
    if (!daxParsed || !selectedDataset) return;
    
    setSaving(true);
    try {
      const res = await fetch('/api/assistente-ia/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: selectedDataset,
          contextType: 'dax',
          daxData: daxParsed,
          group_id: activeGroup?.id
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowDaxModal(false);
        setDaxContent('');
        setDaxFileName(null);
        setDaxParsed(null);
        loadContexts();
        toast.success('Base de DAX salva com sucesso!');
      } else {
        toast.error('Erro: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao salvar base de DAX');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir esta documentação?')) return;
    
    try {
      let deleteUrl = `/api/assistente-ia/context?id=${id}`;
      if (activeGroup?.id) deleteUrl += `&group_id=${activeGroup.id}`;
      const res = await fetch(deleteUrl, { method: 'DELETE' });
      if (res.ok) {
        loadContexts();
        toast.success('Documentação excluída com sucesso!');
      } else {
        toast.error('Erro ao excluir documentação');
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao excluir documentação');
    }
  };

  const chatContext = contexts.find(c => c.context_type === 'chat');
  const daxContext = contexts.find(c => c.context_type === 'dax');

  const getStats = (ctx: ContextInfo | undefined) => {
    if (!ctx) return null;
    return {
      medidas: ctx.section_medidas?.length || 0,
      colunas: ctx.section_tabelas?.reduce((a: number, t: any) => a + (t.columns?.length || 0), 0) || 0,
      queries: ctx.section_queries?.length || 0,
      exemplos: ctx.section_exemplos?.length || 0,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contextos da IA</h1>
              <p className="text-gray-500 text-sm mt-1">Configure as documentações que alimentam o assistente de inteligência artificial</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Ícones de Download */}
              <div className="relative group">
                <button
                  onClick={() => handleDownload('prompt-documentacao-chat.md')}
                  className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                  title="Baixar prompt de Documentação Chat"
                >
                  <Download size={20} />
                </button>
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                  <div className="font-semibold mb-1">Documentação Chat</div>
                  <div className="text-gray-300">Gera documentação estruturada para a IA responder perguntas dos usuários</div>
                </div>
              </div>
              <div className="relative group">
                <button
                  onClick={() => handleDownload('prompt-extrair-dax.md')}
                  className="p-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors"
                  title="Baixar prompt de Extrair DAX"
                >
                  <Download size={20} />
                </button>
                <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 pointer-events-none">
                  <div className="font-semibold mb-1">Extrair DAX</div>
                  <div className="text-gray-300">Extrai todas as medidas e colunas do modelo em formato JSON</div>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
              >
                Como usar
              </button>
            </div>
          </div>

          {/* Seleção de Dataset */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500 bg-white text-gray-900"
            >
              <option value="">
                {datasets.length === 0 ? 'Nenhum dataset encontrado' : 'Selecione um dataset'}
              </option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.dataset_id || ds.id}>{ds.name}</option>
              ))}
            </select>
          </div>


          {loadingContexts ? (
            <div className="text-center py-8 text-gray-500">Carregando contextos...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documentação Chat */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900 mb-1">Documentação para Chat</h2>
                      <p className="text-sm text-gray-500">Usada pela IA para responder perguntas dos usuários</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChatModal(true)}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {chatContext ? 'Atualizar' : 'Importar'}
                  </button>
                </div>

                {!chatContext ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="font-medium">Nenhuma documentação configurada</p>
                    <p className="text-sm mt-1">Importe um arquivo .md para começar</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="font-semibold text-gray-900">Documentação Ativa</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          Atualizado em {new Date(chatContext.parsed_at || chatContext.updated_at).toLocaleString('pt-BR')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const s = getStats(chatContext);
                            return s && (
                              <>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{s.medidas} medidas</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">{s.colunas} colunas</span>
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">{s.queries} queries</span>
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">{s.exemplos} exemplos</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadContext(chatContext)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Baixar documentação"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(chatContext.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Base de DAX */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Database className="text-purple-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <h2 className="font-semibold text-gray-900 mb-1">Base de DAX (Treinamento)</h2>
                      <p className="text-sm text-gray-500">Todas as medidas e colunas do modelo para treinamento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDaxModal(true)}
                    className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    {daxContext ? 'Atualizar' : 'Importar'}
                  </button>
                </div>

                {!daxContext ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="font-medium">Nenhuma base de DAX importada</p>
                    <p className="text-sm mt-1">Importe um arquivo .json para começar</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span className="font-semibold text-gray-900">Base Ativa</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          Atualizado em {new Date(daxContext.parsed_at || daxContext.updated_at).toLocaleString('pt-BR')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const s = getStats(daxContext);
                            return s && (
                              <>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{s.medidas} medidas</span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">{s.colunas} colunas</span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadContext(daxContext)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Baixar base de DAX"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(daxContext.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
      </div>

      {/* Modal de Ajuda */}
        {showHelp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Como Configurar</h3>
                <button onClick={() => setShowHelp(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Documentação para Chat</h4>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside ml-2">
                    <li>Baixe o prompt &quot;Documentação Chat&quot;</li>
                    <li>Execute no Claude + MCP Power BI</li>
                    <li>Importe o arquivo .md gerado nesta tela</li>
                  </ol>
                  <p className="text-xs text-gray-600 mt-3 font-medium">Usada pela IA para responder perguntas dos usuários</p>
                </div>
                
                <div className="p-5 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-gray-900 mb-3">Base de DAX</h4>
                  <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside ml-2">
                    <li>Baixe o prompt &quot;Extrair DAX&quot;</li>
                    <li>Execute no Claude + MCP Power BI</li>
                    <li>Importe o arquivo .json gerado nesta tela</li>
                  </ol>
                  <p className="text-xs text-gray-600 mt-3 font-medium">Base completa para tela de Treinamento</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowHelp(false)}
                className="w-full mt-6 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        )}

        {/* Modal Chat */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Importar Documentação para Chat</h3>
                <button 
                  onClick={() => { 
                    setShowChatModal(false); 
                    setChatContent(''); 
                    setChatFileName(null);
                    setChatParsed(null);
                    setChatStats(null);
                  }} 
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Drag & Drop */}
              {!chatFileName && !chatContent && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'chat')}
                  className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".md"
                    onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0], 'chat')}
                    className="hidden"
                  />
                  <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900 mb-1">Arraste um arquivo .md aqui</p>
                  <p className="text-sm text-gray-500 mb-4">ou</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Selecionar arquivo
                  </button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-3 text-sm text-gray-500">ou cole o texto abaixo</span>
                    </div>
                  </div>
                </div>
              )}

              {chatFileName && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <span className="flex-1 font-medium text-green-900">{chatFileName}</span>
                  <button 
                    onClick={() => { 
                      setChatFileName(null); 
                      setChatContent(''); 
                    }} 
                    className="px-2 py-1 text-sm text-green-700 hover:bg-green-100 rounded transition-colors"
                  >
                    Remover
                  </button>
                </div>
              )}

              <textarea
                value={chatContent}
                onChange={(e) => { 
                  setChatContent(e.target.value); 
                  setChatFileName(null); 
                }}
                placeholder="Ou cole o conteúdo aqui..."
                className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {chatStats && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
                    {['BASE', 'MEDIDAS', 'COLUNAS', 'QUERIES', 'EXEMPLOS'].map((label, i) => {
                      const values = [
                        chatStats.hasBase ? '✅' : '❌', 
                        chatStats.medidasCount, 
                        chatStats.colunasCount, 
                        chatStats.queriesCount, 
                        chatStats.exemplosCount
                      ];
                      const ok = i === 0 ? chatStats.hasBase : values[i] > 0;
                      return (
                        <div key={label} className={`p-2 rounded ${ok ? 'bg-green-100' : 'bg-red-100'}`}>
                          <div className="text-xs text-gray-600">{label}</div>
                          <div className="font-semibold">{values[i]}</div>
                        </div>
                      );
                    })}
                  </div>
                  {chatStats.errors?.length > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                      <span className="font-medium">Avisos: </span>
                      {chatStats.errors.map((e: string, i: number) => <span key={i}>{e}. </span>)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => { 
                    setShowChatModal(false); 
                    setChatContent(''); 
                    setChatFileName(null);
                    setChatParsed(null);
                    setChatStats(null);
                  }} 
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveChat}
                  disabled={!chatParsed || chatParsed.errors.length > 0 || saving}
                  className="flex-1 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar Documentação'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal DAX */}
        {showDaxModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Importar Base de DAX</h3>
                <button 
                  onClick={() => { 
                    setShowDaxModal(false); 
                    setDaxContent(''); 
                    setDaxFileName(null);
                    setDaxParsed(null);
                  }} 
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Drag & Drop */}
              {!daxFileName && !daxContent && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'dax')}
                  className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors ${
                    dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    ref={daxFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={(e) => e.target.files?.[0] && handleFileImport(e.target.files[0], 'dax')}
                    className="hidden"
                  />
                  <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                  <p className="font-medium text-gray-900 mb-1">Arraste um arquivo .json aqui</p>
                  <p className="text-sm text-gray-500 mb-4">ou</p>
                  <button
                    onClick={() => daxFileInputRef.current?.click()}
                    className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Selecionar arquivo
                  </button>
                  
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-white px-3 text-sm text-gray-500">ou cole o JSON abaixo</span>
                    </div>
                  </div>
                </div>
              )}

              {daxFileName && (
                <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg mb-4">
                  <span className="flex-1 font-medium text-purple-900">{daxFileName}</span>
                  <button 
                    onClick={() => { 
                      setDaxFileName(null); 
                      setDaxContent(''); 
                    }} 
                    className="px-2 py-1 text-sm text-purple-700 hover:bg-purple-100 rounded transition-colors"
                  >
                    Remover
                  </button>
                </div>
              )}

              <textarea
                value={daxContent}
                onChange={(e) => { 
                  setDaxContent(e.target.value); 
                  setDaxFileName(null); 
                }}
                placeholder='Cole o JSON aqui... {"modelo": "...", "medidas": [...], "colunas": [...]}'
                className="w-full h-48 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />

              {daxParsed && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-100 rounded">
                      <div className="text-xs text-gray-600">MODELO</div>
                      <div className="font-semibold truncate">{daxParsed.modelo || '✅'}</div>
                    </div>
                    <div className="p-3 bg-blue-100 rounded">
                      <div className="text-xs text-gray-600">MEDIDAS</div>
                      <div className="font-semibold">{daxParsed.medidas?.length || 0}</div>
                    </div>
                    <div className="p-3 bg-green-100 rounded">
                      <div className="text-xs text-gray-600">COLUNAS</div>
                      <div className="font-semibold">{daxParsed.colunas?.length || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              {daxContent && !daxParsed && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                  JSON inválido. Verifique o formato.
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => { 
                    setShowDaxModal(false); 
                    setDaxContent(''); 
                    setDaxFileName(null);
                    setDaxParsed(null);
                  }} 
                  className="flex-1 py-2.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveDax}
                  disabled={!daxParsed || saving}
                  className="flex-1 py-2.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Salvando...' : 'Salvar Base de DAX'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
  );
}

// Componente principal exportado
export default function ContextosPage() {
  return (
    <PermissionGuard>
      <MainLayout>
        <ContextosContent />
      </MainLayout>
    </PermissionGuard>
  );
}
