# Plano de Execução - Notepad por Site

## Visão Geral
Extensão Chrome/Brave para anotações por site, com salvamento automático e configuração dinâmica por domínio.

## Arquitetura de Dados

### 1. Configuração por Domínio (`domainSettings`)
```javascript
{
  "online.igti.com.br": {
    "pattern": "path-segment",
    "segmentIndex": 2,
    "regex": null,
    "createdAt": timestamp
  }
}
```

Padrões suportados:
- `path-segment`: Usa um segmento do path (índice base-1)
- `regex`: Extrai parte via expressão regular
- `full-url`: Usa URL completa como chave
- `domain-only`: Usa apenas o domínio (default)

### 2. Anotações
Chave: `notes_<storageKey>` onde `storageKey` é derivado do URL

```javascript
{
  "note_id": {
    "id": "note_id",
    "title": "Título",
    "content": "Conteúdo",
    "createdAt": timestamp,
    "updatedAt": timestamp
  }
}
```

## Estrutura de Arquivos
```
notepad/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
└── PLANO_DE_EXECUCAO.md
```

## Fluxos Principais

### 1. Primeiro uso em um domínio
1. Popup abre → verifica `domainSettings[domain]`
2. Se não existe → mostra Tela de Configuração com presets:
   - "Segunda pasta do path" (ex: `/courses/8591`)
   - "Domínio completo"
   - "URL completa"
   - "Padrão personalizado (regex)"
3. Usuário seleciona → salva em `domainSettings` → carrega anotações

### 2. Uso normal
1. Popup abre → deriva `storageKey` do URL usando padrão do domínio
2. Carrega `notes_{storageKey}` → mostra Lista (ordenada por `updatedAt` desc)
3. Clique em item → abre Editor (título + conteúdo)
4. Clique "Nova anotação" → abre Editor vazio
5. Edição → debounce 3s ou onblur → salva em `notes_{storageKey}`

### 3. Exportar/Importar
Modal com opções:
- Exportar: Banco total | Domínio atual | Seleção (checkbox por nota)
- Importar: Arquivo JSON → merge ou sobrescrever

## Views do Popup (HTML)

| View | ID | Descrição |
|------|-----|-----------|
| Lista | `#view-list` | Cards: título + data + btn delete |
| Editor | `#view-editor` | Input título + textarea + status salvamento |
| Configuração | `#view-config` | Radio buttons para presets + campo regex customizado |

## Lógica de Derivação de Chave
```javascript
function getStorageKey(url, settings) {
  const urlObj = new URL(url);
  const pathSegments = urlObj.pathname.split('/').filter(Boolean);
  
  switch(settings.pattern) {
    case 'path-segment':
      return pathSegments[settings.segmentIndex - 1] || 'default';
    case 'regex':
      const match = url.match(settings.regex);
      return match ? match[1] : 'default';
    case 'full-url':
      return urlObj.href.replace(/[^a-z0-9]/gi, '_');
    case 'domain-only':
    default:
      return urlObj.hostname;
  }
}
```

## Debounce Implementation
```javascript
let saveTimeout = null;
function debouncedSave(note) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveNote(note), 3000);
}

textarea.addEventListener('input', () => debouncedSave(currentNote));
textarea.addEventListener('blur', () => saveNote(currentNote));
```

## Decisões Tomadas

1. **Escopo de URL**: Configurável por domínio, permitindo escolha do padrão na primeira uso
2. **Confirmação de exclusão**: Inline (botão delete → confirmação no próprio item)
3. **Busca na lista**: Simples, sem filtro (ordenada por data, mais recente primeiro)
4. **Exportar/Importar**: Total db, domínio atual, ou seleção por nota