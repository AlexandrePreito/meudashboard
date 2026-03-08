'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Upload, MessageSquare, Database, Download, Loader2, BookOpen } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import FeatureGate from '@/components/ui/FeatureGate';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import Button from '@/components/ui/Button';
import { parseDocumentation, getDocumentationStats, ParsedDocumentation } from '@/lib/assistente-ia/documentation-parser';
import { useToast } from '@/contexts/ToastContext';
import { useMenu } from '@/contexts/MenuContext';
import { Share2 } from 'lucide-react';

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
  const [resolvedGroupId, setResolvedGroupId] = useState<string>('');
  
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
  const [shareToAllGroups, setShareToAllGroups] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const daxFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDatasets();
    checkUserRole();
  }, [activeGroup?.id]);

  const checkUserRole = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user?.is_master) setUserRole('master');
      else if (data.user?.is_developer) setUserRole('developer');
      else setUserRole('user');
    } catch {}
  };

  useEffect(() => {
    if (selectedDataset) {
      loadContexts();
    }
  }, [selectedDataset, activeGroup?.id, resolvedGroupId]);

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
      
      // Salvar groupId resolvido para uso em loadContexts
      if (groupId) setResolvedGroupId(groupId);
      
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
      const gid = activeGroup?.id || resolvedGroupId;
      const groupParam = gid ? `&group_id=${gid}` : '';
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
        const gid = activeGroup?.id || resolvedGroupId;
        const res = await fetch(`/api/assistente-ia/context?id=${ctx.id}${gid ? `&group_id=${gid}` : ''}`);
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
          group_id: activeGroup?.id,
          share_to_all_groups: shareToAllGroups
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowChatModal(false);
        setChatContent('');
        setChatFileName(null);
        setChatParsed(null);
        setChatStats(null);
        setShareToAllGroups(false);
        loadContexts();
        toast.success(shareToAllGroups ? 'Documentação compartilhada com todos os grupos!' : 'Documentação salva com sucesso!');
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
          group_id: activeGroup?.id,
          share_to_all_groups: shareToAllGroups
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setShowDaxModal(false);
        setDaxContent('');
        setDaxFileName(null);
        setDaxParsed(null);
        setShareToAllGroups(false);
        loadContexts();
        toast.success(shareToAllGroups ? 'Base de DAX compartilhada com todos os grupos!' : 'Base de DAX salva com sucesso!');
      } else {
        console.error('[handleSaveDax] Erro da API:', data);
        const detail = data.details ? ` (${data.details})` : '';
        const hint = data.hint ? ` Dica: ${data.hint}` : '';
        toast.error('Erro: ' + (data.error || 'Erro desconhecido') + detail + hint);
      }
    } catch (error) {
      console.error('[handleSaveDax] Erro:', error);
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
          
          {/* Header - estilo sistema */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Contextos da IA</h1>
              <p className="text-gray-500">Configure as documentações que alimentam o assistente de inteligência artificial</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload('prompt-documentacao-chat.md')}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                title="Baixar prompt de Documentação Chat"
              >
                <Download size={20} />
              </button>
              <button
                onClick={() => handleDownload('prompt-extrair-dax.md')}
                className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                title="Baixar prompt de Extrair DAX"
              >
                <Download size={20} />
              </button>
              <a
                href="/assistente-ia/tutorial-contextos"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BookOpen size={16} />
                Como configurar?
              </a>
            </div>
          </div>

          {/* Seleção de Dataset */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dataset</label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
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
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Documentação Chat */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
                  <Button onClick={() => setShowChatModal(true)}>
                    {chatContext ? 'Atualizar' : 'Importar'}
                  </Button>
                </div>

                {!chatContext ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="font-medium">Nenhuma documentação configurada</p>
                    <p className="text-sm mt-1">Importe um arquivo .md para começar</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
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
                          className="p-2 text-[#686d76] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Baixar documentação"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(chatContext.id)}
                          className="p-2 text-[#686d76] hover:bg-gray-100 rounded-lg transition-colors"
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
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
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
                  <Button onClick={() => setShowDaxModal(true)}>
                    {daxContext ? 'Atualizar' : 'Importar'}
                  </Button>
                </div>

                {!daxContext ? (
                  <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <p className="font-medium">Nenhuma base de DAX importada</p>
                    <p className="text-sm mt-1">Importe um arquivo .json para começar</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
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
                          className="p-2 text-[#686d76] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Baixar base de DAX"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(daxContext.id)}
                          className="p-2 text-[#686d76] hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Modal Chat */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-xl border border-gray-100">
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Selecionar arquivo
                  </Button>
                  
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
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
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
                className="w-full h-48 p-4 border border-gray-300 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {chatStats && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
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

              {userRole === 'developer' && (
                <label className="flex items-center gap-3 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareToAllGroups}
                    onChange={(e) => setShareToAllGroups(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 accent-blue-600"
                  />
                  <Share2 size={16} className="text-amber-600" />
                  <span className="text-sm text-amber-800 font-medium">Compartilhar com todos os meus grupos</span>
                </label>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => { 
                    setShowChatModal(false); 
                    setChatContent(''); 
                    setChatFileName(null);
                    setChatParsed(null);
                    setChatStats(null);
                    setShareToAllGroups(false);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveChat}
                  disabled={!chatParsed || chatParsed.errors.length > 0 || saving}
                  loading={saving}
                  className="flex-1"
                >
                  {saving ? 'Salvando...' : shareToAllGroups ? 'Salvar em Todos os Grupos' : 'Salvar Documentação'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal DAX */}
        {showDaxModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-auto shadow-xl border border-gray-100">
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors ${
                    dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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
                  <Button onClick={() => daxFileInputRef.current?.click()}>
                    Selecionar arquivo
                  </Button>
                  
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
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl mb-4">
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
                className="w-full h-48 p-4 border border-gray-300 rounded-xl font-mono text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              {daxParsed && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
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

              {userRole === 'developer' && (
                <label className="flex items-center gap-3 mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shareToAllGroups}
                    onChange={(e) => setShareToAllGroups(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 accent-blue-600"
                  />
                  <Share2 size={16} className="text-amber-600" />
                  <span className="text-sm text-amber-800 font-medium">Compartilhar com todos os meus grupos</span>
                </label>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => { 
                    setShowDaxModal(false); 
                    setDaxContent(''); 
                    setDaxFileName(null);
                    setDaxParsed(null);
                    setShareToAllGroups(false);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveDax}
                  disabled={!daxParsed || saving}
                  loading={saving}
                  className="flex-1"
                >
                  {saving ? 'Salvando...' : shareToAllGroups ? 'Salvar em Todos os Grupos' : 'Salvar Base de DAX'}
                </Button>
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
        <FeatureGate feature="ai">
          <ContextosContent />
        </FeatureGate>
      </MainLayout>
    </PermissionGuard>
  );
}