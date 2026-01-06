'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import {
  Server,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  ChevronRight,
  Database,
} from 'lucide-react';

interface Datasource {
  id: string;
  datasourceName: string;
  datasourceType: string;
  connectionDetails: string;
  status: 'online' | 'offline' | 'unknown';
}

interface Gateway {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'partial' | 'unknown';
  datasources: Datasource[];
  datasourcesCount: number;
  onlineCount: number;
  offlineCount: number;
  connectionName: string;
}

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0, partial: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGateway, setExpandedGateway] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/powerbi/gateways');

      if (res.status === 403) {
        setError('restricted');
        return;
      }

      if (!res.ok) throw new Error('Erro ao carregar gateways');

      const data = await res.json();
      setGateways(data.gateways || []);
      setSummary({
        total: data.total || 0,
        online: data.online || 0,
        offline: data.offline || 0,
        partial: data.partial || 0
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={12} />
            Online
          </span>
        );
      case 'offline':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={12} />
            Offline
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <AlertCircle size={12} />
            Parcial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <AlertCircle size={12} />
            Desconhecido
          </span>
        );
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <div className="p-2 bg-green-100 rounded-lg"><Wifi className="w-5 h-5 text-green-600" /></div>;
      case 'offline':
        return <div className="p-2 bg-red-100 rounded-lg"><WifiOff className="w-5 h-5 text-red-600" /></div>;
      case 'partial':
        return <div className="p-2 bg-amber-100 rounded-lg"><AlertCircle className="w-5 h-5 text-amber-600" /></div>;
      default:
        return <div className="p-2 bg-gray-100 rounded-lg"><Server className="w-5 h-5 text-gray-600" /></div>;
    }
  };

  if (error === 'restricted') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Shield className="w-20 h-20 text-red-300" />
          <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
          <p className="text-gray-500">Apenas administradores podem acessar esta página.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gateways</h1>
            <p className="text-gray-500 text-sm">Monitoramento dos gateways do Power BI</p>
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            loading={loading}
            icon={<RefreshCw size={16} />}
          >
            Atualizar
          </Button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Server className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-3xl font-bold text-green-600">{summary.online}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Offline</p>
                <p className="text-3xl font-bold text-red-600">{summary.offline}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <WifiOff className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Parcial</p>
                <p className="text-3xl font-bold text-amber-600">{summary.partial}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Gateways */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <XCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <p className="text-gray-500">{error}</p>
            <Button onClick={loadData}>
              Tentar novamente
            </Button>
          </div>
        ) : gateways.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Server className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum gateway encontrado</h3>
            <p className="text-gray-500">Configure gateways no Power BI para monitorá-los aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gateways.map((gateway) => {
              const isExpanded = expandedGateway === gateway.id;
              
              return (
                <div key={gateway.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* Header do Gateway */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedGateway(isExpanded ? null : gateway.id)}
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(gateway.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{gateway.name}</h3>
                          {getStatusBadge(gateway.status)}
                        </div>
                        <p className="text-sm text-gray-500">
                          {gateway.type} • {gateway.connectionName} • {gateway.datasourcesCount} datasource(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <span className="text-green-600 font-medium">{gateway.onlineCount}</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-red-600 font-medium">{gateway.offlineCount}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Datasources Expandidos */}
                  {isExpanded && gateway.datasources.length > 0 && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Datasources</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gateway.datasources.map((ds) => (
                          <div
                            key={ds.id}
                            className="bg-white rounded-lg border border-gray-200 p-3 flex items-start gap-3"
                          >
                            <div className={`p-1.5 rounded ${
                              ds.status === 'online' ? 'bg-green-100' : 
                              ds.status === 'offline' ? 'bg-red-100' : 'bg-gray-100'
                            }`}>
                              <Database className={`w-4 h-4 ${
                                ds.status === 'online' ? 'text-green-600' : 
                                ds.status === 'offline' ? 'text-red-600' : 'text-gray-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-sm">{ds.datasourceName}</p>
                              <p className="text-xs text-gray-500">{ds.datasourceType}</p>
                              {ds.connectionDetails && (
                                <p className="text-xs text-gray-400 font-mono truncate mt-1">
                                  {ds.connectionDetails}
                                </p>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              ds.status === 'online' ? 'bg-green-100 text-green-700' : 
                              ds.status === 'offline' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {ds.status === 'online' ? 'Online' : ds.status === 'offline' ? 'Offline' : '?'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}




