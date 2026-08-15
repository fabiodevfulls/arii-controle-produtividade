<div align="center">

<img src="public/report-energy-banner.png" alt="ARII Controle de Produtividade" width="100%" />

# ARII · Controle de Produtividade

### Inteligência operacional para equipes de Backoffice

Uma plataforma moderna para registrar atividades, acompanhar indicadores e transformar a rotina operacional em dados claros para atendentes e supervisores.

[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-a3e635?style=for-the-badge)](https://github.com/fabiodevfulls/arii-controle-produtividade)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License](https://img.shields.io/badge/uso-projeto%20autoral-132238?style=for-the-badge)](#autor)

[Ver demonstração](https://controle-backoffice-arii.fabio-boy-2010-fs.chatgpt.site) · [Conhecer recursos](#-principais-recursos) · [Executar localmente](#-executando-localmente)

</div>

---

## ✨ Sobre o projeto

O **ARII** centraliza o controle de protocolos, ligações e atividades do Backoffice em um único ambiente. Cada atendente acompanha a própria produção enquanto a supervisão visualiza indicadores consolidados, histórico e relatórios exportáveis.

> Projeto de inovação desenvolvido para apoiar a operação de Backoffice da Equatorial Piauí.

## 🎯 O problema que resolvemos

Informações espalhadas em anotações e controles manuais dificultam a rastreabilidade, atrasam análises e aumentam o risco de lançamentos incorretos. O ARII cria um fluxo padronizado e transforma cada registro em informação útil para a gestão.

| Antes | Com o ARII |
| --- | --- |
| Controles manuais e dispersos | Dados centralizados e estruturados |
| Consulta demorada de protocolos | Pesquisa rápida e histórico rastreável |
| Indicadores calculados manualmente | Produtividade atualizada automaticamente |
| Pouca visibilidade da equipe | Painel consolidado para supervisão |

## 🚀 Principais recursos

- 🔐 **Autenticação e perfis** — acesso seguro para atendentes e supervisores.
- 📝 **Registro operacional** — protocolos e ligações com tipologia, estado, data e quantidade.
- 📊 **Dashboard inteligente** — indicadores diários de produção e produtividade.
- 👥 **Gestão da equipe** — visão consolidada, filtros e acompanhamento por atendente.
- 🔎 **Histórico pesquisável** — localização rápida de atividades e protocolos anteriores.
- ✏️ **Correção de registros** — edição e exclusão controladas pelo proprietário do lançamento.
- 📄 **Relatórios profissionais** — exportação para PDF, Excel e integração com Power BI.
- 📱 **Interface responsiva** — experiência adaptada para diferentes tamanhos de tela.

## 🧰 Tecnologias

<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg" width="54" height="54" alt="React" title="React" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg" width="54" height="54" alt="Next.js" title="Next.js" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg" width="54" height="54" alt="TypeScript" title="TypeScript" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg" width="54" height="54" alt="Vite" title="Vite" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/supabase/supabase-original.svg" width="54" height="54" alt="Supabase" title="Supabase" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cloudflare/cloudflare-original.svg" width="54" height="54" alt="Cloudflare" title="Cloudflare" />
  &nbsp;&nbsp;
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sqlite/sqlite-original.svg" width="54" height="54" alt="SQLite" title="SQLite" />
</div>

<br />

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface | React 19 + TypeScript | Componentes, experiência visual e tipagem |
| Aplicação | Next.js + Vinext + Vite | Rotas, renderização e build otimizado |
| Autenticação | Supabase Auth | Cadastro, login e sessões de usuário |
| Persistência | Cloudflare D1 / SQLite | Atividades, contas e indicadores |
| ORM | Drizzle ORM | Modelagem e acesso tipado aos dados |
| Hospedagem | Cloudflare Workers | Execução distribuída e publicação |
| Análise | Power BI | Consumo e visualização de dados operacionais |

## 🏗️ Arquitetura

```text
Usuário
  │
  ▼
React + Next.js
  │
  ├── Supabase Auth ── identidade e sessão
  │
  └── API da aplicação
          │
          ▼
   Cloudflare Workers
          │
          ▼
      D1 / SQLite ── registros e indicadores
          │
          └── Power BI ── análise operacional
```

## 🔄 Fluxo de uso

1. O atendente cria sua conta e acessa a plataforma.
2. Protocolos e ligações são registrados em um formulário padronizado.
3. Os lançamentos atualizam automaticamente o relatório individual.
4. A supervisão acompanha a produção consolidada da equipe.
5. Os dados podem ser pesquisados, filtrados e exportados.

## 💻 Executando localmente

### Pré-requisitos

- Node.js **22.13 ou superior**
- pnpm
- Conta no Supabase
- Conta Cloudflare com Workers e D1 configurados

### Instalação

```bash
git clone https://github.com/fabiodevfulls/arii-controle-produtividade.git
cd arii-controle-produtividade
pnpm install
```

Crie o arquivo `.dev.vars` a partir do exemplo:

```bash
cp .dev.vars.example .dev.vars
```

Preencha as variáveis localmente — nunca publique credenciais:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA_SUPABASE
SUPERVISOR_EMAILS=supervisor@empresa.com
```

Inicie o ambiente de desenvolvimento:

```bash
pnpm dev
```

## 📁 Estrutura principal

```text
arii-controle-produtividade/
├── app/                 # Interface, páginas e rotas de API
├── db/                  # Conexão e esquema do banco
├── drizzle/             # Migrações do banco de dados
├── public/              # Imagens e recursos visuais
├── power-bi/            # Consulta e documentação do Power BI
├── scripts/             # Build e validação de artefatos
├── tests/               # Testes automatizados
├── worker/              # Worker Cloudflare
└── wrangler.jsonc       # Configuração de deploy e D1
```

## 🔒 Segurança

- Arquivos `.env` e `.dev.vars` são ignorados pelo Git.
- Credenciais devem ser cadastradas apenas no ambiente local ou como secrets da Cloudflare.
- Alterações em atividades são validadas no servidor conforme usuário e perfil.
- O arquivo `.dev.vars.example` contém somente valores ilustrativos.

## 🗺️ Evolução do produto

- [x] Registro de protocolos e ligações
- [x] Dashboard individual e da supervisão
- [x] Autenticação e separação por perfil
- [x] Histórico, filtros e exportações
- [x] Integração para Power BI
- [ ] Ampliar a cobertura de testes automatizados
- [ ] Adicionar monitoramento e métricas operacionais
- [ ] Documentar o processo completo de implantação

## 👨‍💻 Autor

**Fabio da Silva Araujo**  
Projeto ARII · Equatorial Piauí · Backoffice

<div align="center">

### Gostou do projeto?

Deixe uma ⭐ no repositório e acompanhe a evolução do ARII.

</div>
