# Notepad por Site

![Chrome Web Store](https://img.shields.io/badge/Chrome-Brave%20%7C%20Chrome-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Extensão para Chrome/Brave que permite criar, editar e excluir anotações associadas a sites visitados. Substitui a necessidade de caderno físico em portais de cursos EAD.

## Funcionalidades

- Anotações separadas por "escopo" de URL (configurável por domínio)
- Salvamento automático (3 segundos após parar de digitar ou ao perder foco)
- Lista de anotações com data de última modificação
- Criação, seleção e exclusão de anotações
- Configuração inicial de padrão de URL por domínio
- Exportar/Importar anotações (banco total, domínio atual, seleção)

## Instalação

1. Abra `chrome://extensions` ou `brave://extensions`
2. Ative **Modo de desenvolvedor** (canto superior direito)
3. Clique em **Carregar descompactado**
4. Selecione a pasta do projeto

## Uso

### Primeiro uso em um domínio

1. Clique no ícone da extensão
2. Selecione o padrão de URL para aquele domínio:
   - **Segunda pasta do path**: para plataformas como `site.com/courses/123`
   - **Domínio completo**: todas as páginas compartilham as mesmas anotações
   - **URL completa**: cada URL tem suas próprias anotações
   - **Regex customizado**: extração via expressão regular
3. Clique **Salvar Configuração**

### Criar anotações

1. Clique em **+ Nova Anotação**
2. Digite o título e o conteúdo
3. O salvamento é automático (3s após parar de digitar ou ao sair do campo)

### Editar anotações

1. Clique em qualquer anotação na lista para abri-la
2. Edite o conteúdo
3. Salvamento automático

### Exportar/Importar

1. Clique no ícone 💾 para abrir o modal de exportação
2. Escolha o escopo:
   - Banco de dados completo
   - Domínio atual
   - Seleção de anotações específicas
3. Clique **Exportar** para baixar o arquivo JSON

## Estrutura de Dados

### Configuração por Domínio

Armazenada em `chrome.storage.local` com a chave `domainSettings`:
```json
{
  "example.com": {
    "pattern": "path-segment",
    "segmentIndex": 2,
    "createdAt": 1234567890
  }
}
```

### Anotações

Armazenadas com a chave `notes_{storageKey}`:
```json
{
  "note_id": {
    "id": "note_id",
    "title": "Título",
    "content": "Conteúdo",
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

## Padrões de URL Suportados

| Padrão | Descrição | Exemplo |
|--------|-----------|---------|
| `path-segment` | Usa um segmento do path (índice base-1) | `/courses/8591` → segmentIndex=2 → "8591" |
| `regex` | Extrai parte via expressão regular | `/courses/(\d+)` → captura o número |
| `full-url` | Usa URL completa como chave | Única por URL |
| `domain-only` | Usa apenas o domínio | Compartilha entre páginas |

## Tecnologias

- Manifest V3 (Chrome Extension)
- HTML/CSS/JavaScript (vanilla)
- chrome.storage API para persistência

## Autor

[Ataua Doederlein](https://github.com/ataua)

## Licença

[MIT](LICENSE)
