# Prumo RDO — Teste completo

Roteiro para pôr o app inteiro à prova antes da banca. Cada item tem um **código** (A01, D07…). Quando algo falhar, anote o código, o que apareceu na tela e, se possível, um print — com isso dá para corrigir sem precisar reproduzir.

**Tempo estimado:** 2 a 3 horas com três pessoas.
**Material:** três celulares com Expo Go (de preferência um Android e um iPhone entre eles), notebook com o projeto.

| Celular | Conta | Quem opera |
|---|---|---|
| **A** | `master@prumo.dev` | Responsável técnico |
| **B** | `operacional@prumo.dev` | Equipe de campo |
| **C** | `cliente@prumo.dev` | Contratante |

Senha dos três: `prumo2026`.

**Legenda:** ☐ = ainda não testado · marcar **OK** ou **FALHOU** na tabela do fim.

---

## 0. Preparação (no notebook)

```bash
cd prumo-app
npm run db:reset
npm run db:seed
npm run db:test      # tem que dar 8 de 8
npm run db:fluxo     # tem que dar TUDO PASSOU
npx expo start -c
```

Se a rede não conectar os celulares, use `npx expo start -c --tunnel`.

---

## A. Login e sessão (fazer nos três celulares)

| Código | Faça | Esperado |
|---|---|---|
| A01 | Entre com `master@prumo.dev` e senha `errada` | Caixa vermelha: "E-mail ou senha incorretos." |
| A02 | Digite `master@` e toque em Entrar | "E-mail inválido" embaixo do campo, sem chamar o servidor |
| A03 | Toque no olho do campo de senha | A senha aparece e some ao tocar de novo |
| A04 | Entre com cada conta | **A:** Início, Obras, Avisos, Perfil · **B:** Meus RDOs, Novo RDO, Avisos, Perfil · **C:** Ciência, Avisos, Perfil |
| A05 | Feche o app de vez (tire da lista de apps abertos) e abra de novo | Continua logado, sem passar pelo login |
| A06 | Perfil → ligue "Desbloqueio por biometria" → feche o app de vez → abra | Pede digital/rosto. Confirmando, entra |
| A07 | Repita A06, mas cancele a biometria | Tela "Prumo RDO bloqueado" com "Entrar com a senha", que leva ao login. Nada trava |
| A08 | Aparelho sem biometria cadastrada: abra Perfil | O interruptor aparece desligado e desabilitado, com o motivo escrito |
| A09 | Login → "Esqueci minha senha" → digite um e-mail | Mostra "E-mail enviado" (não confirma se a conta existe, de propósito) |
| A10 | Perfil → Sair → Cancelar; depois Sair → Sair | Primeiro nada muda; depois volta ao login |

## B. Navegação e visual

| Código | Faça | Esperado |
|---|---|---|
| B01 | Troque de aba várias vezes, rápido | A pílula branca desliza até o ícone, sem piscar; o ícone muda de cor junto |
| B02 | Olhe a barra nos três celulares | Nunca passa da largura da tela; só ícones, sem texto |
| B03 | Configurações do celular → aumente a fonte ao máximo → volte ao app | Textos maiores, nada cortado ou sobreposto de forma que impeça o uso |
| B04 | Ative o modo escuro do sistema | O app continua claro e legível (é só modo claro, de propósito) |
| B05 | Role qualquer lista até o fim | O último item não fica escondido atrás da barra de baixo |

## C. Obras (celular A)

| Código | Faça | Esperado |
|---|---|---|
| C01 | Obras | Aparecem **Residencial Alfa** e **Terminal Beta** |
| C02 | Nova obra → nome "Ab" → Criar | "Informe o nome da obra" |
| C03 | Início 10/10/2026, término 01/01/2026 | "A previsão de término não pode ser antes do início" |
| C04 | Data 31/02/2026 | "Data incompleta ou inexistente" |
| C05 | Crie a **Obra Gama** com todos os campos | Abre o detalhe da obra; você aparece na equipe como Responsável técnico |
| C06 | Editar dados → mude o contrato → Salvar | Volta ao detalhe com o contrato novo |
| C07 | Equipe → Gerenciar → selecione Carlos Andrade → papel "Equipe de campo" → Vincular | Carlos passa para "Vinculados" |
| C08 | **Celular B:** vá para outra aba e volte para Novo RDO | A **Obra Gama** aparece |
| C09 | **Celular A:** desvincule Carlos da Obra Gama. **Celular B:** troque de aba e volte para Novo RDO | A Obra Gama some |
| C10 | **Celular A:** Obra Gama → Inativar obra → confirmar | Marcada como INATIVA na lista; botão vira "Reativar obra" |
| C11 | **Celulares B e C:** procure a aba Obras | Não existe |
| C12 | Obra Alfa → RDOs recentes → toque num RDO | Abre o detalhe daquele RDO |

## D. RDO sem internet (celular B) — o bloco mais importante

Antes: com internet, abra **Novo RDO** uma vez (o app guarda as obras e o "RDO anterior" para usar offline). Depois **ative o modo avião**.

| Código | Faça | Esperado |
|---|---|---|
| D01 | Olhe o indicador em Meus RDOs / Novo RDO | Laranja: "Sem conexão" |
| D02 | Novo RDO → Residencial Alfa | Abre o assistente na etapa 1 de 8 |
| D03 | Identificação: digite uma data de amanhã → Avançar | Bloqueia: "A data do RDO não pode ser no futuro." |
| D04 | Volte para hoje, turno Integral → **Importar do RDO anterior** | Mão de obra, equipamentos e atividades preenchidos (quantidades do dia em branco) |
| D05 | Clima: ligue a Tarde → "Chuva fraca" → Avançar sem preencher a duração | Bloqueia: "Choveu na tarde: informe a duração…" e "…descreva o impacto" |
| D06 | Preencha 40 min e o impacto → Avançar | Passa |
| D07 | Mão de obra: ajuste até **12 trabalhadores** | O cartão azul soma trabalhadores e homem-hora na hora |
| D08 | Deixe uma função em branco → Avançar | "Mão de obra, linha N: informe a função" |
| D09 | Equipamentos: coloque 2 horas paradas num deles → Avançar | Bloqueia até informar o motivo da parada |
| D10 | Deixe **3 equipamentos** | — |
| D11 | Atividades: ligue "Dia sem produção", justificativa "chuva" → Avançar | "Justifique… (mínimo de 10 caracteres)" |
| D12 | Desligue "Dia sem produção"; numa atividade coloque avanço 150 | "Entre 0 e 100" e o Avançar bloqueia |
| D13 | Ocorrências: horário "99:99" | "horário no formato HH:MM" |
| D14 | Remova uma linha qualquer (lixeira) | Pede confirmação; ao confirmar, some |
| D15 | Toque nos segmentos da barra de progresso lá em cima | Pula direto para a etapa tocada |
| D16 | Toque no X do topo, depois abra o rascunho em Meus RDOs | Tudo que foi digitado está lá |
| D17 | Feche o app de vez e abra de novo (ainda em modo avião) | O rascunho continua em Meus RDOs, "Aguardando envio" |
| D18 | Crie um **segundo** rascunho na mesma obra, mesma data e turno | Aviso amarelo de possível duplicidade (não bloqueia) |

## E. Fotos (celular B, ainda em modo avião)

| Código | Faça | Esperado |
|---|---|---|
| E01 | Etapa Fotos → Câmera (primeira vez) | Pedido de permissão com o motivo explicado |
| E02 | Negue a permissão | Mensagem explicando que precisa liberar nas configurações; nada trava |
| E03 | Libere a permissão e tire uma foto | Abre a tela de legenda com a prévia |
| E04 | Digite "abc" | "Salvar foto" continua desabilitado; mostra quantos caracteres faltam |
| E05 | Legenda completa + vincule a uma atividade → Salvar | A foto entra na lista com "Aguardando envio" e o nome da atividade |
| E06 | Tire mais 2 (uma pela **Galeria**) | 3 fotos na lista |
| E07 | Tire uma quarta e toque em **Descartar** | Não entra na lista |
| E08 | Remova uma das fotos (lixeira) | Pede confirmação e some |

## F. Sincronização (celular B)

| Código | Faça | Esperado |
|---|---|---|
| F01 | **Desative o modo avião** e não toque em nada | Em segundos: "Enviando…" → "Tudo enviado" |
| F02 | Veja o rascunho em Meus RDOs | Ganhou número (**RDO n. 4** se o seed foi limpo) e "Salvo no servidor" |
| F03 | Abra a etapa Fotos | As 3 fotos marcadas como "Enviada" (ícone verde) |
| F04 | No painel do Supabase → Table Editor → `rdos` | **Uma única** linha nova para esse RDO, não duas |
| F05 | Edite um campo com internet e saia | Volta a "Salvo no servidor" em poucos segundos |
| F06 | Modo avião → edite → feche o app de vez → tire o modo avião → abra o app | Envia sozinho ao abrir |
| F07 | Toque no indicador de sincronização com itens pendentes | Força o envio na hora |

## G. Fluxo de validação (três celulares)

| Código | Faça | Esperado |
|---|---|---|
| G01 | **B:** Revisão com algo faltando | Lista vermelha "Falta para submeter"; tocar num item leva à etapa |
| G02 | **B:** tudo preenchido, sem marcar a declaração → Submeter | Bloqueia: "Aceite a declaração de responsabilidade." |
| G03 | **B:** marque a declaração → Submeter → confirmar | "RDO n. X submetido" e abre o detalhe com o cadeado |
| G04 | **B:** Meus RDOs | O RDO saiu de "Em edição" e está em "Enviados", com cadeado |
| G05 | **C:** Ciência | O RDO **não** aparece (ainda não foi validado) |
| G06 | **A:** notificação "RDO n. X aguardando análise" | Chega em poucos segundos |
| G07 | **A:** toque na notificação | Abre o RDO, que passa a "Em análise" |
| G08 | **A:** "Comentar" numa atividade, numa foto e no RDO inteiro | Os três comentários aparecem, cada um indicando o alvo |
| G09 | **A:** Devolver → motivo "curto" | Botão desabilitado (mínimo 10 caracteres) |
| G10 | **A:** Devolver com motivo completo | Status "Devolvido" |
| G11 | **B:** notificação de devolução → Meus RDOs | Cartão laranja com o motivo, em "Para corrigir" |
| G12 | **B:** toque → corrija (troque uma foto) → Revisão → declaração → Submeter | Submetido de novo |
| G13 | **A:** Validar e assinar → senha **errada** | "Senha incorreta. A assinatura não foi registrada." |
| G14 | **A:** Validar e assinar → senha certa | Status "Aguardando cliente"; cadeado; nenhum botão de edição |
| G15 | **C:** notificação → Ciência | O RDO aparece |
| G16 | **C:** Esclarecer → pergunta → Enviar | Volta para "Em análise"; **A** recebe aviso com a pergunta |
| G17 | **A:** Validar e assinar de novo | Volta para o cliente |
| G18 | **C:** Com ressalva → ressalva vazia | Botão desabilitado |
| G19 | **C:** Com ressalva → texto + senha → Assinar | Status **Finalizado**; **A** e **B** recebem aviso |
| G20 | Qualquer celular: Linha do tempo do RDO | Criação, submissões, devolução, comentários, pedido de esclarecimento e as assinaturas, em ordem, com data e hora |

## H. Avisos (notificações)

| Código | Faça | Esperado |
|---|---|---|
| H01 | Com avisos novos, olhe a barra de baixo | Contador amarelo no sino |
| H02 | Avisos → toque num não lido | Abre o RDO e o contador diminui |
| H03 | "Marcar todas como lidas" | Contador some; filtro "Não lidas" fica vazio |
| H04 | Deixe **A** com o app em segundo plano; **B** submete um RDO | A notificação aparece no topo do celular A |
| H05 | Negue a permissão de notificação num celular | Os avisos continuam chegando na aba Avisos, só sem o alerta no topo |

## I. PDF (celular A, no RDO finalizado)

| Código | Faça | Esperado |
|---|---|---|
| I01 | Gerar PDF final | O botão mostra as etapas: fotos → PDF → SHA-256 → envio → registro |
| I02 | Abra o PDF (Compartilhar → abrir) | Tem: cabeçalho Prumo RDO, número, obra, data, clima, mão de obra com total HH, equipamentos, atividades, ocorrências, pendências, **fotos com legenda**, comentários, **ressalva do cliente**, assinaturas com data e hora, QR Code no rodapé |
| I03 | Compartilhar pelo WhatsApp | O arquivo chega como PDF |
| I04 | Verificar autenticidade | Verde: "Documento íntegro", com o hash calculado igual ao registrado |
| I05 | Feche e abra o RDO de novo | "Gerar PDF final" não existe mais — o hash só é registrado uma vez |
| I06 | **C:** abra o mesmo RDO → Compartilhar e Verificar | Funcionam também para o cliente |
| I07 | Leia o QR do PDF com a câmera de outro celular | Mostra o texto `PRUMO-RDO|…|n X|v1|…|sha256:…` |

## J. Painel, busca, auditoria e retificação (celular A)

| Código | Faça | Esperado |
|---|---|---|
| J01 | Início | Quatro contadores (Para analisar, Devolvidos, Aguardando cliente, Finalizados) batendo com a situação real |
| J02 | Toque num contador | A caixa de análise abaixo filtra por aquela situação |
| J03 | Bloco "RDOs atrasados" | Lista as obras com dias úteis sem RDO |
| J04 | Bloco "Homem-hora da semana" | Soma da semana por obra, com barra proporcional |
| J05 | Buscar → número do RDO | Só aquele RDO |
| J06 | Buscar → período com "Até" antes do "De" | Erro no campo e Buscar desabilitado |
| J07 | Buscar → por obra e por situação | Resultados corretos |
| J08 | RDO → Ver histórico de auditoria | Lista cada inclusão e alteração, com quem fez e quando |
| J09 | **B e C:** abram o mesmo RDO | Não aparece a seção de auditoria |
| J10 | RDO finalizado → Retificar → motivo | Abre a **versão 2**, em rascunho, com o motivo em destaque |
| J11 | Volte à versão original | Status "Retificado", conteúdo intacto, faixa "Esta versão foi retificada" com link para a nova |
| J12 | Na versão 2: Editar rascunho → mude algo → Submeter | Segue o fluxo normal (análise, validação, cliente) |
| J13 | Cancele um RDO em análise com motivo | Status "Cancelado"; faixa vermelha com o motivo; o RDO **não** some |

## K. A tese: segurança no banco

| Código | Faça | Esperado |
|---|---|---|
| K01 | **B:** Novo RDO e Meus RDOs | A **Obra Beta** nunca aparece |
| K02 | **C:** Ciência → Finalizados e Aguardando você | Nunca aparecem rascunhos nem RDOs em análise |
| K03 | Painel do Supabase → SQL Editor → cole `supabase/tests/violacao.sql` → Run | Tabela com 8 linhas PASSOU e a linha RESUMO |
| K04 | No SQL Editor: `update rdos set sem_producao_justificativa = 'x' where status = 'finalizado';` | Erro: "…o conteúdo não pode mais ser alterado" (o trigger barra até o dono do banco) |
| K05 | No SQL Editor: `delete from rdos where numero = 1;` | Erro: "RDO não pode ser excluído…" |
| K06 | No SQL Editor: `update auditoria set acao = 'X' where id = 1;` | Erro: "A auditoria é somente gravação…" |

## L. Robustez

| Código | Faça | Esperado |
|---|---|---|
| L01 | Com 3 fotos pendentes, tire o modo avião e **ative de novo no meio do envio** | Nada se perde; ao voltar a rede, termina de enviar sem duplicar |
| L02 | Feche o app de vez durante um envio | Ao reabrir, retoma sozinho |
| L03 | Mesmo login (`operacional`) em dois celulares, editando RDOs diferentes | Cada um vê só os próprios rascunhos locais; os enviados aparecem nos dois |
| L04 | Deixe o app parado por mais de 1 hora e volte | Continua logado e funcionando (o token renova sozinho) |
| L05 | Rede ruim (4G fraco) durante a geração do PDF | Mostra erro claro, sem registrar hash pela metade; dá para tentar de novo |

---

## Resultado

Copie esta tabela, preencha e mande de volta.

| Código | OK / FALHOU | O que aconteceu (se falhou) | Celular (Android/iPhone) |
|---|---|---|---|
| A01 | | | |
| … | | | |

**Critério de pronto para a banca:** blocos D, E, F, G, I e K sem nenhuma falha. Os demais aceitam pequenas falhas visuais, desde que não travem o roteiro da apresentação (`ROTEIRO-DEMO.md`).
