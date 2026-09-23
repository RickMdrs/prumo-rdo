/**
 * Datas do domínio são `date` (YYYY-MM-DD), sem hora. Montar com `new Date()`
 * a partir dessa string faz o JavaScript interpretar como UTC e voltar um dia
 * no fuso de São Luís — por isso o corte é feito no texto.
 */
export function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Hoje no fuso da obra, no formato aceito pela coluna `date`. */
export function hojeNaObra(fuso = 'America/Fortaleza'): string {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
  return partes;
}
