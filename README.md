# ARII - Controle Inteligente de Produtividade no Backoffice

Plataforma digital para registrar protocolos e ligações, acompanhar a produtividade diária e oferecer rastreabilidade operacional para atendentes e supervisores.

> Projeto de inovação desenvolvido para o contexto de Backoffice da Equatorial Piauí.

## Sobre o projeto

O ARII centraliza atividades operacionais que antes poderiam ficar distribuídas em anotações e controles manuais. A solução permite que cada atendente registre seu trabalho, acompanhe indicadores individuais por dia e consulte seu histórico. A supervisão conta com uma visão consolidada do desempenho da equipe e relatórios exportáveis.

## Problema

Controles manuais e informações dispersas dificultam:

- o acompanhamento diário da produtividade;
- a localização de protocolos e registros antigos;
- a identificação de erros de lançamento;
- a análise do desempenho individual e da equipe;
- a rastreabilidade das atividades realizadas no Backoffice.

## Solução proposta

O ARII reúne autenticação, registro operacional, consulta e indicadores em uma única plataforma. Os dados ficam separados por usuário, enquanto a supervisão acessa uma visão consolidada da equipe.

## Tecnologias e arquitetura

O projeto utiliza uma base moderna, responsiva e preparada para evolução:

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface | React + TypeScript | Construção da experiência visual com componentes tipados |
| Aplicação | Next.js + Vite | Estrutura e ferramentas de desenvolvimento da aplicação |
| Autenticação | Supabase Auth | Cadastro, login e controle de acesso dos usuários |
| Hospedagem | Cloudflare Workers | Execução e disponibilização da aplicação na infraestrutura Cloudflare |
| Dados | D1 / SQLite | Persistência dos registros e indicadores operacionais |

### Ecossistema do projeto

- React
- Next.js
- TypeScript
- Supabase
- Cloudflare
- Vite
- SQLite

## Principais funcionalidades

### Acesso e perfis

- Cadastro público para atendentes.
- Autenticação por e-mail e senha.
- Área individual com registros e relatório do próprio usuário.
- Perfil de supervisão sem cadastro público.
- Separação dos dados conforme o perfil de acesso.

### Registro de atividades

- Registro de protocolos e ligações.
- Classificação por tipologia e estado atendido.
- Armazenamento de data, horário e quantidade.
- Inclusão do link relacionado ao sistema de Backoffice.
- Exclusão de lançamentos incorretos.
- Busca por protocolo, tipologia, estado ou atendente.

### Relatório individual

- Indicadores separados por dia trabalhado.
- Total de protocolos e ligações.
- Tempo produtivo.
- Percentual de produtividade.
- Quantidade de atividades por tipologia.
- Comparação com a meta diária individual.

### Painel da supervisão

- Visão diária consolidada da equipe.
- Filtros por data e atendente.
- Consulta de registros anteriores.
- Indicadores de protocolos, ligações, total de atividades e produtividade.
- Exportação de relatórios em Excel e PDF.

## Fluxo de uso

1. O atendente cria sua conta e entra na plataforma.
2. Cada protocolo ou ligação é registrado em um formulário padronizado.
3. Os lançamentos alimentam automaticamente o relatório individual do dia.
4. A supervisão acompanha os resultados consolidados da equipe.
5. Os relatórios podem ser filtrados e exportados para análise.

## Informações registradas

| Campo | Finalidade |
| --- | --- |
| Tipo de atividade | Identificar protocolo ou ligação |
| Número do protocolo | Garantir identificação e rastreabilidade |
| Tipologia | Classificar o atendimento realizado |
| Estado tratado | Indicar a unidade federativa relacionada |
| Data e horário | Registrar quando a atividade ocorreu |
| Quantidade | Contabilizar a produção |
| Link do Backoffice | Vincular o lançamento à operação original |

## Benefícios esperados

- Centralização das informações operacionais.
- Redução de controles manuais e anotações dispersas.
- Acompanhamento transparente da produtividade.
- Correção rápida de registros lançados incorretamente.
- Consulta simplificada do histórico.
- Maior rastreabilidade das atividades.
- Relatórios padronizados para tomada de decisão.

## Status do projeto

🧪 **Protótipo em desenvolvimento**

O conceito funcional, as principais telas e a arquitetura tecnológica já foram definidos. O processo de instalação, as versões das dependências e o endereço público do protótipo deverão ser adicionados ao repositório quando a implementação for disponibilizada.

## Próximos passos

- Publicar o código-fonte no repositório.
- Documentar as versões das tecnologias e a configuração da arquitetura.
- Adicionar instruções de configuração e execução.
- Incluir capturas das principais telas.
- Disponibilizar um link direto para demonstração.
- Definir regras de cálculo da produtividade e das metas.
- Implementar testes e validações de segurança.

## Autor

**Fabio da Silva Araujo**  
Equatorial Piauí - Backoffice

---

Se este projeto foi útil ou despertou seu interesse, deixe uma estrela no repositório.

