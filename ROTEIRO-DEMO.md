# Prumo RDO — Roteiro da banca

Três celulares com Expo Go, um por perfil. Senha dos três: `prumo2026`.

| Celular | Login | O que mostra |
|---|---|---|
| A | `master@prumo.dev` | Responsável técnico: painel, análise, validação, PDF |
| B | `operacional@prumo.dev` | Campo: RDO offline, fotos, submissão |
| C | `cliente@prumo.dev` | Contratante: ciência com ressalva |

---

## Antes de entrar na sala (30 min antes)

```bash
cd prumo-app
npm run db:reset      # banco do zero (opcional: só se quiser apagar RDOs de ensaio)
npm run db:seed       # empresa, 3 usuários, Obras Alfa e Beta, 3 RDOs antigos
npm run db:test       # 8/8 — prova da tese, ao vivo se pedirem
npx expo start --tunnel
```

1. Escanear o QR nos três celulares e **entrar com cada conta antes de a banca começar**.
2. Em cada celular, aceitar o pedido de notificações.
3. No celular B, abrir **Novo RDO** uma vez com internet (guarda as obras para o modo avião).
4. Deixar os três na primeira aba.

---

## O roteiro

### 1. Master mostra a obra e a equipe — celular A
**Obras → Residencial Alfa — Bloco A → Equipe.** Mostrar os três vinculados, cada um com seu papel.

> Frase: "O vínculo à obra é a permissão. Quem não está aqui não enxerga nada desta obra — e isso não é a tela escondendo, é o banco recusando."

**Plano B:** se a lista não carregar, puxar para atualizar. Se a rede caiu, pular para o passo 2 (que é offline de propósito) e voltar depois.

### 2. Operacional cria o RDO em modo avião — celular B
1. Ativar **modo avião**. O indicador fica laranja: "Sem conexão".
2. **Novo RDO → Residencial Alfa.**
3. **Identificação:** data de hoje, turno Integral. Tocar em **Importar do RDO anterior** (preenche equipe e equipamentos).
4. **Clima:** Manhã com sol. Tarde com **chuva fraca** → tentar **Avançar** sem a duração: aparece "Choveu na tarde: informe a duração da chuva". Preencher 40 min e o impacto.
5. **Mão de obra:** ajustar até **12 trabalhadores** (o total de homem-hora aparece no cartão azul).
6. **Equipamentos:** 3 equipamentos. Em um deles, colocar 2 h paradas → **Avançar** é bloqueado até informar o motivo.
7. **Atividades:** uma ou duas, com local.
8. **Fotos:** tirar **3 fotos**. Mostrar que o botão **Salvar foto** só acende com legenda de 5 caracteres ou mais. Vincular uma delas a uma atividade.
9. **Revisão:** mostrar a lista do que falta; marcar a declaração.
10. Fechar o app de vez (tirar da memória) e abrir de novo → o rascunho continua em **Meus RDOs**, "Aguardando envio".

**Plano B:** se a câmera não abrir, usar **Galeria**. Se o Expo Go travar no modo avião, desativar o modo avião e mostrar que o rascunho continua lá (o ponto do offline já ficou provado pelo reinício).

### 3. Tirar o modo avião — celular B
O indicador passa para "Enviando…" e depois "Tudo enviado". O rascunho ganha **número** (RDO n. 4, se o seed foi rodado limpo).

> Frase: "O número foi dado pelo banco, com trava na linha da obra. Se a resposta tivesse se perdido e o app tentasse de novo, o banco devolveria o mesmo RDO — não existe RDO em dobro."

**Plano B:** puxar para atualizar em Meus RDOs ou tocar no indicador de sincronização.

### 4. Operacional submete → Master é avisado — celulares B e A
Na revisão, **Submeter RDO**. Em poucos segundos o celular A recebe a notificação "RDO n. 4 aguardando análise" e o contador aparece no sino.

**Plano B:** se a notificação local não aparecer (permissão negada), abrir **Início** no celular A — o RDO já está em "Para analisar". A notificação também fica na aba **Avisos**.

### 5. Master comenta a foto e devolve — celular A
Abrir o RDO (ele passa sozinho para **Em análise**). Em uma foto, **Comentar** → "Foto sem enquadramento do pavimento". Depois **Devolver** com o motivo.

### 6. Operacional corrige e reenvia → Master valida — celulares B e A
- B recebe a notificação. Em **Meus RDOs**, o RDO aparece destacado em laranja com o motivo. Tocar → corrigir (trocar a foto) → Revisão → declaração → **Submeter**.
- A abre de novo → **Validar e assinar** → lê a declaração → **digita a senha** → Assinar.
- Mostrar o **cadeado** no topo: daqui em diante nenhuma tela oferece edição.

**Plano B:** senha errada mostra "Senha incorreta. A assinatura não foi registrada." — serve até como demonstração.

### 7. Cliente assina com ressalva — celular C
Notificação chega. **Ciência → RDO → Com ressalva** → texto da ressalva → senha → assinar. O status vira **Finalizado**.

### 8. PDF final, compartilhado e verificado — celular A
No RDO finalizado: **Gerar PDF final** (mostra as etapas: fotos, PDF, SHA-256, envio, registro) → **Compartilhar** pelo WhatsApp. Depois **Verificar autenticidade** → "Documento íntegro", com os dois hashes iguais.

**Plano B:** se o WhatsApp não estiver instalado, compartilhar por e-mail ou "Salvar em Arquivos".

### 9. (Bônus) A tese no SQL Editor
Abrir o painel do Supabase → **SQL Editor** → colar `supabase/tests/violacao.sql` → **Run**. A tabela mostra os 8 casos PASSOU. Apontar o **T03**: o RDO assinado recusou a alteração **com a RLS desligada** — o trigger vale até para a chave mestra.

Alternativa pelo terminal: `npm run db:test`.

---

## Checklist de véspera

- [ ] Abrir o painel do Supabase na semana da apresentação (o plano grátis pausa projetos parados).
- [ ] `npm run db:reset && npm run db:seed` em base limpa.
- [ ] `npm run db:test` → 8/8 e `npm run db:fluxo` → TUDO PASSOU.
- [ ] Os três celulares com o **Expo Go atualizado**, testados **na rede do local**. Se a rede bloquear, `npx expo start --tunnel`.
- [ ] Contas logadas nos três antes de começar; notificações permitidas.
- [ ] Celular B aberto uma vez em **Novo RDO** com internet (cache das obras para o modo avião).
- [ ] Bateria acima de 80% nos três e no notebook.
- [ ] **Vídeo de backup** gravado do roteiro completo, caso a internet caia.

## Comandos úteis

| Comando | Para quê |
|---|---|
| `npm run db:reset` | Apaga e recria o banco a partir das migrações |
| `npm run db:seed` | Cenário da demonstração (idempotente) |
| `npm run db:test` | Os 8 testes de violação (T01–T08) |
| `npm run db:fluxo` | 40 verificações do fluxo completo pela API real |
| `npm run db:types` | Regera `src/types/database.ts` depois de uma migração |
| `npx expo start -c` | Sobe o app limpando o cache (use depois de mexer no `.env`) |
