'use client';

import { useState } from 'react';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code,
  List,
  Smile,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';

interface MessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  alertName?: string;
  showTemplates?: boolean;
  previewValue?: string;  // NOVO - valor real do DAX para preview
}

const TEMPLATES = [
  {
    name: 'Alerta Simples',
    content: '🔔 *{{nome_alerta}}*\n\n📊 Valor: *{{valor}}*\n📅 {{data}} às {{hora}}'
  },
  {
    name: 'Alerta Urgente',
    content: '🚨 *URGENTE - {{nome_alerta}}*\n\n⚠️ Atenção imediata necessária!\n\n📊 Valor atual: *{{valor}}*\n🎯 Limite: {{threshold}}\n📅 {{data}} às {{hora}}\n\n_Ação requerida!_'
  },
  {
    name: 'Relatório Diário',
    content: '📊 *RELATÓRIO - {{nome_alerta}}*\n━━━━━━━━━━━━━━━\n\n📈 Resultado: *{{valor}}*\n📅 Data: {{data}}\n\n━━━━━━━━━━━━━━━\n✅ Processado automaticamente'
  },
  {
    name: 'Meta Atingida',
    content: '🎉 *META ATINGIDA!*\n\n{{nome_alerta}}\n\n🏆 Valor: *{{valor}}*\n🎯 Meta: {{threshold}}\n\nParabéns à equipe! 👏\n\n📅 {{data}}'
  }
];

const EMOJIS = ['📊', '📈', '📉', '💰', '🎯', '✅', '❌', '⚠️', '🔔', '🚨', '📅', '🕐', '💡', '🏆', '🎉', '👏', '📋', '📌', '🔥', '⭐'];

export default function MessageEditor({ value, onChange, alertName = 'Meu Alerta', showTemplates = true, previewValue }: MessageEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplatesPicker, setShowTemplatesPicker] = useState(false);

  function insertFormat(prefix: string, suffix: string = prefix) {
    const textarea = document.querySelector('textarea[data-message-editor]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newValue = value.substring(0, start) + prefix + selectedText + suffix + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  }

  function insertEmoji(emoji: string) {
    const textarea = document.querySelector('textarea[data-message-editor]') as HTMLTextAreaElement;
    const pos = textarea?.selectionStart || value.length;
    const newValue = value.substring(0, pos) + emoji + value.substring(pos);
    onChange(newValue);
    setShowEmojiPicker(false);
  }

  function applyTemplate(template: typeof TEMPLATES[0]) {
    onChange(template.content);
    setShowTemplatesPicker(false);
  }

  function renderPreview() {
    let preview = value
      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/~([^~]+)~/g, '<del>$1</del>')
      .replace(/```([^`]+)```/g, '<code class="bg-gray-200 px-1 rounded">$1</code>')
      .replace(/\n/g, '<br>');

    // Substituir variáveis com valores de exemplo
    const now = new Date();
    preview = preview
      .replace(/\{\{nome_alerta\}\}/g, `<span class="bg-blue-100 text-blue-700 px-1 rounded">${alertName}</span>`)
      .replace(/\{\{valor\}\}/g, `<span class="bg-green-100 text-green-700 px-1 rounded">${previewValue || 'R$ 0,00'}</span>`)
      .replace(/\{\{data\}\}/g, `<span class="bg-purple-100 text-purple-700 px-1 rounded">${now.toLocaleDateString('pt-BR')}</span>`)
      .replace(/\{\{hora\}\}/g, `<span class="bg-purple-100 text-purple-700 px-1 rounded">${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`)
      .replace(/\{\{condicao\}\}/g, '<span class="bg-orange-100 text-orange-700 px-1 rounded">Maior que</span>')
      .replace(/\{\{threshold\}\}/g, '<span class="bg-red-100 text-red-700 px-1 rounded">50.000</span>')
      .replace(/\{\{filial\}\}/g, '<span class="bg-yellow-100 text-yellow-700 px-1 rounded">Matriz</span>');

    return preview;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200 flex-wrap">
        <button
          type="button"
          onClick={() => insertFormat('*')}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
          title="Negrito"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('_')}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
          title="Itálico"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('~')}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
          title="Tachado"
        >
          <Strikethrough size={16} />
        </button>
        <button
          type="button"
          onClick={() => insertFormat('```')}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
          title="Código"
        >
          <Code size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Emoji Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="Emojis"
          >
            <Smile size={16} />
          </button>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 w-64">
              <div className="grid grid-cols-10 gap-1">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 rounded text-sm"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            )}
        </div>

        {/* Templates */}
        {showTemplates && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplatesPicker(!showTemplatesPicker)}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors flex items-center gap-1"
              title="Templates"
            >
              <FileText size={16} />
              <span className="text-xs">Templates</span>
            </button>
            {showTemplatesPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 w-64">
                <p className="text-xs text-gray-500 mb-2 px-2">Escolha um template:</p>
                {TEMPLATES.map(template => (
                  <button
                    key={template.name}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Preview Toggle */}
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`p-2 rounded transition-colors flex items-center gap-1 ${
            showPreview ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-200'
          }`}
          title={showPreview ? 'Ocultar preview' : 'Ver preview'}
        >
          {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          <span className="text-xs">{showPreview ? 'Editar' : 'Preview'}</span>
        </button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className="p-4 min-h-[200px] bg-gray-50">
          <div className="bg-white rounded-lg p-4 shadow-sm max-w-md">
            <div 
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderPreview() }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Preview de como a mensagem aparecerá no WhatsApp
          </p>
        </div>
      ) : (
        <textarea
          data-message-editor
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite sua mensagem aqui...

Use *texto* para negrito
Use _texto_ para itálico
Use ~texto~ para tachado
Use {{variavel}} para dados dinâmicos"
          className="w-full p-4 min-h-[200px] resize-none focus:outline-none text-sm font-mono"
        />
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {value.length} caracteres
        </span>
        <span className="text-xs text-gray-400">
          Formatação WhatsApp: *negrito* _itálico_ ~tachado~
        </span>
      </div>
    </div>
  );
}

