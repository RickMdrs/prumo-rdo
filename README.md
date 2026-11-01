# Prumo RDO

**O que aconteceu na obra, no prumo.**

App mobile de **Registro Diário de Obra (RDO)** que substitui os registros em papel e pelo WhatsApp por uma fonte
única, validada e assinada. Projeto acadêmico de Engenharia de Software na UNDB, desenvolvido pela equipe
Hackatronic a partir de uma demanda real de uma construtora.

## O problema

No canteiro de obras, o diário de cada dia costuma ficar espalhado em papel, fotos soltas e mensagens de WhatsApp.
Isso dificulta comprovar o que foi feito, quem estava na obra e o que aconteceu, justamente quando o registro é
mais necessário: em uma auditoria, uma medição ou uma disputa com o contratante.

## A solução

Um app com três perfis, cada um com o seu papel no fluxo do RDO:

| Perfil | O que faz |
|---|---|
| **Operacional** (campo) | Preenche o RDO na obra, **mesmo sem internet**: clima, mão de obra, equipamentos, atividades, ocorrências e fotos |
| **Responsável técnico** | Analisa, pede correção ou valida o RDO, acompanha o painel e gera o **PDF** |
| **Contratante** | Dá ciência no RDO validado, com ou sem ressalva |

## Destaques técnicos

- **Offline-first:** o RDO é salvo localmente em SQLite e sincronizado sozinho quando a conexão volta
- **Integridade dos registros:** hash **SHA-256** do PDF de cada RDO e trilha de auditoria de todas as ações
- **Segurança no banco:** regras de **Row Level Security (RLS)** no PostgreSQL, com testes SQL que tentam violar as regras
- **Fluxo com estados:** rascunho → submetido → em análise → validado → enviado ao contratante → finalizado, com funções no banco que impedem pular etapas
- **PDF do RDO** gerado no próprio celular, com QR Code de verificação
- **Notificações em tempo real** com Supabase Realtime
- **Trava biométrica** opcional para abrir o app
- **12 migrations** versionadas e scripts para criar, popular e testar o banco

**Stack:** React Native · Expo · TypeScript · Expo Router · Supabase (PostgreSQL, Auth, Storage, Realtime) · SQLite ·
TanStack Query · React Hook Form

## Como rodar

Requisitos: **Node.js 18+**, um projeto no **Supabase** e o app **Expo Go** no celular.

```bash
npm install
cp .env.example .env    # preencha com a URL e a chave anon do seu projeto Supabase
npm run db:migrate      # cria as tabelas, as regras de segurança e as funções
npm run db:seed         # cria uma empresa, usuários de teste, obras e RDOs de exemplo
npx expo start          # escaneie o QR Code com o Expo Go
```

Outros comandos úteis:

| Comando | O que faz |
|---|---|
| `npm run db:test` | Roda os testes de segurança do banco |
| `npm run db:fluxo` | Testa o fluxo completo de um RDO |
| `npm run typecheck` | Verifica os tipos do TypeScript |
| `npm run lint` | Verifica o padrão do código |

## Estrutura

```
app/            telas (Expo Router): login, início, novo RDO, meus RDOs, obras, ciência, notificações
src/features/   regras de cada funcionalidade: rdo, fluxo, fotos, sync, pdf, auth, painel, notificações
src/lib/        banco local, sincronização, hash, geração de PDF e cliente do Supabase
supabase/       migrations do banco e testes de segurança
scripts/        criação, população e testes do banco
docs/           roteiros de teste e melhorias de interface
```
