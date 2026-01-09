'use client';

import { useState, useRef } from 'react';
import { Bold, Italic, Strikethrough, Code, Smile, FileText, Eye, X } from 'lucide-react';

interface MessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  alertName?: string;
}

const EMOJI_LIST = ['📊', '📈', '📉', '💰', '💵', '🏪', '🏢', '📅', '⏰', '✅', '❌', '⚠️', '🚨', 'ℹ️', '🔔', '📣', '👋', '👍', '🎯', '🔥'];

const TEMPLATES = [
  {
    name: 'Simples',
    template: '🔔 *{{nome_alerta}}*\n\n📊 Valor: *{{valor}}*\n\n📅 {{data}} às {{hora}}'
  },
  {
    name: 'Detalhado',
    template: '⚠️ *ALERTA: {{nome_alerta}}*\n\nOlá!\n\nO valor monitorado atingiu: *{{valor}}*\n\nCondição: {{condicao}} {{threshold}}\n\n📅 {{data}} às {{hora}}\n\nFique atento a esta informação!'
  },
  {
    name: 'Por Filial',
    template: '📊 *{{nome_alerta}}*\n\n🏢 *Resultado por Filial:*\n\n{{valor}}\n\n📅 Gerado em {{data}} às {{hora}}'
  },
  {
    name: 'Urgente',
    template: '🚨 *URGENTE: {{nome_alerta}}*\n\n⚠️ Atenção imediata necessária!\n\n💰 Valor: *{{valor}}*\n\n📅 {{data}} às {{hora}}\n\nTome as medidas necessárias!'
  }
];

export default function MessageEditor({ value, onChange, placeholder, rows = 8, alertName = 'Meu Alerta' }: MessageEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const wrapSelection = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      const newText = value.substring(0, start) + wrapper + selectedText + wrapper + value.substring(end);
      onChange(newText);
    } else {
      insertAtCursor(wrapper, wrapper);
    }
  };

  const insertEmoji = (emoji: string) => {
    insertAtCursor(emoji);
    setShowEmojis(false);
  };

  const applyTemplate = (template: string) => {
    onChange(template);
    setShowTemplates(false);
  };

  // Gerar preview com valores de exemplo
  const getPreviewMessage = () => {
    const now = new Date();
    const exampleValues: Record<string, string> = {
      '{{nome_alerta}}': alertName,
      '{{valor}}': 'Filial Centro: R$ 45.230,00\nFilial Sul: R$ 38.150,00\nFilial Norte: R$ 32.890,00\nTOTAL: R$ 116.270,00',
      '{{data}}': now.toLocaleDateString('pt-BR'),
      '{{hora}}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      '{{condicao}}': 'maior que',
      '{{threshold}}': '100.000',
    };

    let preview = value;
    Object.entries(exampleValues).forEach(([key, val]) => {
      preview = preview.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
    });

    return preview;
  };

  // Renderizar texto com formatação WhatsApp
  const renderWhatsAppText = (text: string) => {
    // Negrito: *texto*
    text = text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    // Itálico: _texto_
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Riscado: ~texto~
    text = text.replace(/~([^~]+)~/g, '<del>$1</del>');
    // Monospace: ```texto```
    text = text.replace(/```([^`]+)```/g, '<code class="bg-gray-200 px-1 rounded">$1</code>');
    // Quebras de linha
    text = text.replace(/\n/g, '<br/>');
    
    return text;
  };

  return (
    <>
      <div className="border-2 border-green-400 rounded-lg overflow-hidden">
        {/* Barra de ferramentas */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
          <button
            type="button"
            onClick={() => wrapSelection('*')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Negrito (*texto*)"
          >
            <Bold size={16} className="text-gray-600" />
          </button>
          
          <button
            type="button"
            onClick={() => wrapSelection('_')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Itálico (_texto_)"
          >
            <Italic size={16} className="text-gray-600" />
          </button>
          
          <button
            type="button"
            onClick={() => wrapSelection('~')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Riscado (~texto~)"
          >
            <Strikethrough size={16} className="text-gray-600" />
          </button>
          
          <button
            type="button"
            onClick={() => wrapSelection('```')}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Monospace (```texto```)"
          >
            <Code size={16} className="text-gray-600" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Emojis */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowEmojis(!showEmojis); setShowTemplates(false); }}
              className={`p-1.5 hover:bg-gray-200 rounded transition-colors ${showEmojis ? 'bg-gray-200' : ''}`}
              title="Emojis"
            >
              <Smile size={16} className="text-gray-600" />
            </button>
            
            {showEmojis && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-48">
                <div className="grid grid-cols-5 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="p-1.5 hover:bg-gray-100 rounded text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Templates */}
          <div className="relative">
            <button
              type="button"
              onClick={() => { setShowTemplates(!showTemplates); setShowEmojis(false); }}
              className={`flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded transition-colors text-sm ${showTemplates ? 'bg-gray-200' : ''}`}
              title="Templates prontos"
            >
              <FileText size={14} className="text-gray-600" />
              <span className="text-gray-600 text-xs">Templates</span>
            </button>
            
            {showTemplates && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 w-64">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => applyTemplate(t.template)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm font-medium text-gray-700">{t.name}</span>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{t.template.substring(0, 50)}...</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1" />

          {/* Preview */}
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors text-sm"
            title="Visualizar mensagem"
          >
            <Eye size={14} />
            <span className="text-xs">Preview</span>
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Digite sua mensagem..."}
          rows={rows}
          className="w-full px-3 py-2 text-sm resize-none focus:outline-none"
        />
      </div>

      {/* Modal de Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Preview WhatsApp</h3>
                  <p className="text-xs text-gray-500">Como a mensagem será exibida</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Mensagem estilo WhatsApp */}
            <div className="p-4 bg-[#e5ded8] min-h-[200px]">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] ml-auto">
                <div 
                  className="text-sm text-gray-800 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: renderWhatsAppText(getPreviewMessage()) }}
                />
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-gray-500">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-blue-500 text-xs">✓✓</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
