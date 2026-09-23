import gerarQr from 'qrcode-generator';

import type { RdoCompleto } from '@/features/rdo/detalhe';

/**
 * HTML do PDF final. Função pura, sem dependência nativa: recebe o RDO, as
 * fotos já em base64 e o hash do conteúdo, e devolve o documento pronto para
 * o expo-print converter.
 */

const TURNO = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite', integral: 'Integral' } as const;
const PERIODO: Record<string, string> = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
const CONDICAO = {
  sol: 'Sol',
  nublado: 'Nublado',
  chuva_fraca: 'Chuva fraca',
  chuva_forte: 'Chuva forte',
  impraticavel: 'Impraticável',
} as const;
const ASSINATURA = {
  validacao_master: 'Validação técnica',
  ciencia_cliente: 'Ciência do cliente',
  ciencia_cliente_com_ressalva: 'Ciência do cliente com ressalva',
} as const;

/** Todo texto digitado pelo usuário passa por aqui antes de entrar no HTML. */
function esc(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function num(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

function data(iso: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function dataHora(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Fortaleza',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Representação estável do conteúdo técnico do RDO. O hash dela vai no QR:
 * o PDF não pode conter o hash dos próprios bytes (mudaria ao ser impresso),
 * então o QR prova o conteúdo e o hash do arquivo fica registrado no banco.
 */
export function conteudoCanonico(d: RdoCompleto): string {
  const semUrl = d.fotos.map(({ url: _url, ...f }) => f);
  return JSON.stringify({
    id: d.rdo.id,
    numero: d.rdo.numero,
    versao: d.rdo.versao,
    obra: d.obra.id,
    data: d.rdo.data,
    turno: d.rdo.turno,
    sem_producao: d.rdo.sem_producao_justificativa,
    clima: d.clima,
    mao_obra: d.maoObra,
    equipamentos: d.equipamentos,
    atividades: d.atividades,
    ocorrencias: d.ocorrencias,
    pendencias: d.pendencias,
    fotos: semUrl,
    assinaturas: d.assinaturas.map(({ perfis: _p, ...a }) => a),
  });
}

function qrSvg(texto: string): string {
  const qr = gerarQr(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
}

function tabela(cabecalho: string[], linhas: string[][], vazio: string): string {
  if (linhas.length === 0) return `<p class="vazio">${esc(vazio)}</p>`;
  return `<table><thead><tr>${cabecalho.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${linhas.map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

export function montarHtmlRdo(
  d: RdoCompleto,
  fotosBase64: Record<string, string>,
  hashConteudo: string,
): string {
  const { rdo, obra } = d;
  const hh = d.maoObra.reduce((s, l) => s + l.quantidade * Number(l.horas), 0);
  const trabalhadores = d.maoObra.reduce((s, l) => s + l.quantidade, 0);
  const ressalvas = d.assinaturas.filter((a) => a.ressalva);

  const qr = qrSvg(
    `PRUMO-RDO|${obra.id}|n${rdo.numero}|v${rdo.versao}|${rdo.id}|sha256:${hashConteudo}`,
  );

  const atividadeDe = (id: string | null) => d.atividades.find((a) => a.id === id)?.servico;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<style>
  @page { size: A4; margin: 16mm 14mm 22mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; font-size: 10.5pt; line-height: 1.4; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1E3A5F; padding-bottom: 10px; margin-bottom: 14px; }
  .marca { font-size: 18pt; font-weight: 800; color: #1E3A5F; letter-spacing: -0.5px; }
  .marca small { display: block; font-size: 8.5pt; font-weight: 500; color: #4B5563; letter-spacing: 0; }
  .numero { text-align: right; }
  .numero b { font-size: 16pt; color: #1E3A5F; }
  .status { display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 99px; background: #E3F2EA; color: #067647; font-size: 8pt; font-weight: 700; }
  .grade { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 18px; margin-bottom: 8px; }
  .grade div span { color: #4B5563; font-size: 8.5pt; display: block; }
  h2 { font-size: 11pt; color: #1E3A5F; margin: 16px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #E5E7EB; page-break-after: avoid; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; page-break-inside: auto; }
  th { background: #F4F6F9; text-align: left; font-size: 8.5pt; color: #4B5563; font-weight: 600; }
  th, td { padding: 4px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  tr { page-break-inside: avoid; }
  .total { background: #1E3A5F; color: #fff; padding: 6px 10px; border-radius: 6px; font-weight: 700; margin-bottom: 6px; }
  .vazio { color: #9CA3AF; font-style: italic; margin: 2px 0; }
  .ressalva { border-left: 4px solid #B45309; background: #FDF3E3; padding: 8px 10px; margin: 6px 0; border-radius: 4px; }
  .ressalva b { color: #B45309; }
  .fotos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .foto { page-break-inside: avoid; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px; }
  .foto img { width: 100%; height: 190px; object-fit: cover; border-radius: 4px; }
  .foto p { margin: 4px 0 0; font-size: 9pt; }
  .foto small { color: #4B5563; }
  .assinatura { border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; page-break-inside: avoid; }
  .assinatura .decl { color: #4B5563; font-size: 8.5pt; margin-top: 4px; }
  .comentario { padding: 4px 0; border-bottom: 1px dashed #E5E7EB; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #E5E7EB; display: flex; gap: 14px; align-items: center; page-break-inside: avoid; }
  footer .qr { width: 92px; height: 92px; flex-shrink: 0; }
  footer .qr svg { width: 92px; height: 92px; }
  footer p { margin: 2px 0; font-size: 8pt; color: #4B5563; word-break: break-all; }
</style></head>
<body>
<header>
  <div class="marca">Prumo RDO<small>Registro Diário de Obra · PLANENGEN Consultoria e Construção LTDA</small></div>
  <div class="numero"><b>RDO n. ${esc(rdo.numero)}</b>${rdo.versao > 1 ? ` <small>(versão ${esc(rdo.versao)})</small>` : ''}<br/>
    <span class="status">FINALIZADO</span></div>
</header>

<div class="grade">
  <div><span>Obra</span>${esc(obra.nome)}</div>
  <div><span>Contrato</span>${esc(obra.contrato ?? '—')}</div>
  <div><span>Cliente</span>${esc(obra.cliente_nome ?? '—')}</div>
  <div><span>Endereço</span>${esc(obra.endereco ?? '—')}</div>
  <div><span>Data · Turno</span>${data(rdo.data)} · ${TURNO[rdo.turno]}</div>
  <div><span>Responsável pelo registro</span>${esc(d.autor?.nome ?? '—')}</div>
</div>
${rdo.motivo_retificacao ? `<div class="ressalva"><b>Retificação:</b> ${esc(rdo.motivo_retificacao)}</div>` : ''}

<h2>Clima</h2>
${tabela(
  ['Período', 'Condição', 'Temp.', 'Chuva', 'Impacto', 'Paralisado'],
  d.clima.map((c) => [
    esc(PERIODO[c.periodo]),
    esc(CONDICAO[c.condicao]),
    c.temperatura_c !== null ? `${num(c.temperatura_c)} °C` : '—',
    c.choveu
      ? `${esc(c.chuva_duracao_min)} min${c.precipitacao_mm ? ` · ${num(c.precipitacao_mm)} mm` : ''}`
      : 'Não',
    esc(c.chuva_impacto ?? '—'),
    c.horas_paralisadas ? `${num(c.horas_paralisadas)} h` : '—',
  ]),
  'Sem registro de clima.',
)}

<h2>Mão de obra</h2>
<div class="total">${trabalhadores} trabalhadores · ${num(hh)} homem-hora</div>
${tabela(
  ['Função', 'Equipe', 'Qtd.', 'Horas', 'HH'],
  d.maoObra.map((l) => [
    esc(l.funcao),
    esc(l.equipe ?? '—'),
    esc(l.quantidade),
    num(l.horas),
    num(l.quantidade * Number(l.horas)),
  ]),
  'Sem mão de obra lançada.',
)}

<h2>Equipamentos</h2>
${tabela(
  ['Equipamento', 'Qtd.', 'Produtivas', 'Paradas', 'Motivo', 'Operador'],
  d.equipamentos.map((e) => [
    `${esc(e.tipo)}${e.identificacao ? ` · ${esc(e.identificacao)}` : ''}`,
    esc(e.quantidade),
    `${num(e.horas_produtivas)} h`,
    `${num(e.horas_paradas)} h`,
    esc(e.motivo_parada ?? '—'),
    esc(e.operador ?? '—'),
  ]),
  'Sem equipamentos lançados.',
)}

<h2>Atividades</h2>
${
  rdo.sem_producao_justificativa
    ? `<p><b>Dia sem produção.</b> ${esc(rdo.sem_producao_justificativa)}</p>`
    : tabela(
        ['Serviço', 'Local', 'Qtd. do dia', '% acum.', 'Situação'],
        d.atividades.map((a) => [
          `${esc(a.servico)}${a.descricao ? `<br/><small>${esc(a.descricao)}</small>` : ''}`,
          esc(a.local ?? '—'),
          a.quantidade_dia !== null ? `${num(a.quantidade_dia)} ${esc(a.unidade ?? '')}` : '—',
          a.percentual !== null ? `${num(a.percentual)}%` : '—',
          esc(a.situacao ?? '—'),
        ]),
        'Sem atividades.',
      )
}

<h2>Ocorrências</h2>
${tabela(
  ['Horário', 'Ocorrência', 'Impacto', 'Ação imediata', 'Responsável'],
  d.ocorrencias.map((o) => [
    o.horario ? dataHora(o.horario).slice(-5) : '—',
    esc(o.descricao),
    esc(o.impacto ?? '—'),
    esc(o.acao_imediata ?? '—'),
    esc(o.responsavel ?? '—'),
  ]),
  'Sem ocorrências.',
)}

<h2>Pendências</h2>
${tabela(
  ['Pendência', 'Responsável', 'Prazo', 'Criticidade'],
  d.pendencias.map((p) => [
    esc(p.descricao),
    esc(p.responsavel ?? '—'),
    data(p.prazo),
    esc(p.criticidade ?? '—'),
  ]),
  'Sem pendências.',
)}

<h2>Fotos (${d.fotos.length})</h2>
${
  d.fotos.length === 0
    ? '<p class="vazio">Sem fotos.</p>'
    : `<div class="fotos">${d.fotos
        .map(
          (f) => `<div class="foto">
        ${fotosBase64[f.id] ? `<img src="${fotosBase64[f.id]}" />` : '<p class="vazio">Imagem indisponível</p>'}
        <p>${esc(f.legenda)}</p>
        ${f.atividade_id ? `<small>Atividade: ${esc(atividadeDe(f.atividade_id) ?? '')}</small>` : ''}
        ${f.ocorrencia_id ? '<small>Vinculada a ocorrência</small>' : ''}
      </div>`,
        )
        .join('')}</div>`
}

${
  d.comentarios.length > 0
    ? `<h2>Comentários</h2>${d.comentarios
        .map(
          (c) =>
            `<div class="comentario"><b>${esc(c.perfis?.nome)}</b> · <small>${dataHora(c.created_at)}</small><br/>${esc(c.texto)}</div>`,
        )
        .join('')}`
    : ''
}

${
  ressalvas.length > 0
    ? `<h2>Ressalva do cliente</h2>${ressalvas
        .map((a) => `<div class="ressalva"><b>${esc(a.perfis?.nome)}:</b> ${esc(a.ressalva)}</div>`)
        .join('')}`
    : ''
}

<h2>Assinaturas</h2>
${d.assinaturas
  .map(
    (a) => `<div class="assinatura">
      <b>${esc(ASSINATURA[a.tipo])}</b> — ${esc(a.perfis?.nome)}<br/>
      <small>${dataHora(a.created_at)} (horário de São Luís) · versão ${esc(a.versao)} · ${esc(a.dispositivo ?? '')}</small>
      <div class="decl">${esc(a.declaracao_texto)}</div>
    </div>`,
  )
  .join('')}

<footer>
  <div class="qr">${qr}</div>
  <div>
    <p><b>Verificação de autenticidade</b></p>
    <p>RDO n. ${esc(rdo.numero)} · versão ${esc(rdo.versao)} · id ${esc(rdo.id)}</p>
    <p>SHA-256 do conteúdo: ${esc(hashConteudo)}</p>
    <p>O hash deste arquivo PDF é registrado no sistema no momento da emissão e pode ser conferido no aplicativo Prumo RDO, em “Verificar autenticidade”.</p>
    <p>Emitido em ${dataHora(new Date().toISOString())}.</p>
  </div>
</footer>
</body></html>`;
}
