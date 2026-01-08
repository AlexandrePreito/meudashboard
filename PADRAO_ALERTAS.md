# 🔔 Padrão de Alertas e Notificações do Sistema

## ✅ Sistema Implementado: Toasts

O sistema agora usa **Toasts modernos** em vez de `alert()` nativo do JavaScript.

---

## 📦 Componentes Criados

### 1. `src/contexts/ToastContext.tsx`
Contexto React que gerencia as notificações do sistema.

### 2. Provider adicionado em `app/layout.tsx`
Envolve toda a aplicação para disponibilizar os toasts.

---

## 🎨 Tipos de Toasts

### ✅ Success (Sucesso)
```typescript
toast.success('Operação realizada com sucesso!');
```
- **Cor:** Verde
- **Ícone:** CheckCircle
- **Uso:** Confirmações de ações bem-sucedidas

### ❌ Error (Erro)
```typescript
toast.error('Erro ao processar a operação');
```
- **Cor:** Vermelho
- **Ícone:** XCircle
- **Uso:** Erros e falhas

### ⚠️ Warning (Aviso)
```typescript
toast.warning('Atenção: Alguns campos estão vazios');
```
- **Cor:** Amarelo
- **Ícone:** AlertTriangle
- **Uso:** Avisos e alertas não críticos

### ℹ️ Info (Informação)
```typescript
toast.info('Processamento iniciado...');
```
- **Cor:** Azul
- **Ícone:** Info
- **Uso:** Informações gerais

---

## 💻 Como Usar

### 1. Import o hook
```typescript
import { useToast } from '@/contexts/ToastContext';
```

### 2. Use no componente
```typescript
export default function MeuComponente() {
  const toast = useToast();
  
  async function handleSave() {
    try {
      const res = await fetch('/api/save');
      if (res.ok) {
        toast.success('Dados salvos com sucesso!');
      } else {
        toast.error('Erro ao salvar dados');
      }
    } catch (error) {
      toast.error('Erro de conexão');
    }
  }
  
  return <button onClick={handleSave}>Salvar</button>;
}
```

---

## 🚫 O QUE NÃO USAR

### ❌ EVITE:
```typescript
alert('Mensagem');           // NÃO usar
confirm('Confirma?');        // NÃO usar
window.alert('Mensagem');    // NÃO usar
```

### ✅ USE:
```typescript
toast.success('Mensagem');   // Usar para sucesso
toast.error('Mensagem');     // Usar para erros
toast.warning('Mensagem');   // Usar para avisos
toast.info('Mensagem');      // Usar para informações
```

---

## 🎯 Características dos Toasts

✅ **Posição:** Canto superior direito  
✅ **Duração:** 4 segundos (automático)  
✅ **Empilhamento:** Múltiplos toasts podem aparecer ao mesmo tempo  
✅ **Fechamento:** Botão X para fechar manualmente  
✅ **Animação:** Slide-in suave  
✅ **Responsivo:** Adapta-se a dispositivos móveis  
✅ **Acessível:** Cores e ícones claros  

---

## 📋 Checklist de Migração

### Arquivos já migrados:
- ✅ `app/configuracoes/page.tsx`

### Arquivos para migrar (116 alerts no total):
- ⏳ `app/whatsapp/instancias/page.tsx`
- ⏳ `app/whatsapp/numeros/page.tsx`
- ⏳ `app/whatsapp/grupos/page.tsx`
- ⏳ `app/powerbi/telas/page.tsx`
- ⏳ `app/powerbi/page.tsx`
- ⏳ `app/alertas/page.tsx`
- ⏳ `app/alertas/novo/page.tsx`
- ⏳ `app/alertas/[id]/page.tsx`
- ⏳ E outros...

---

## 🎨 Visual dos Toasts

```
┌─────────────────────────────────────┐
│ ✓  Operação realizada com sucesso! │ × │
└─────────────────────────────────────┘
```

- Fundo colorido conforme tipo
- Borda destacada
- Ícone à esquerda
- Mensagem centralizada
- Botão fechar (X) à direita

---

## 📝 Padrões de Mensagens

### Sucesso:
- "Usuário criado com sucesso!"
- "Dados salvos!"
- "Configuração atualizada!"

### Erro:
- "Erro ao salvar dados"
- "Campos obrigatórios não preenchidos"
- "Erro de conexão com o servidor"

### Aviso:
- "Atenção: Esta ação não pode ser desfeita"
- "Alguns campos estão incompletos"

### Info:
- "Processamento iniciado..."
- "Copiado para área de transferência"
- "Aguarde, carregando..."
