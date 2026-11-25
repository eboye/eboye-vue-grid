import type { GridMessages } from '../types'
import { packHelpers } from './plural'

const { num, plural } = packHelpers('es')
const rows = (n: number, shown?: string) => plural(n, { one: '# fila', other: '# filas' }, shown)

/** Español. `messages: es` (per grid) or `createVueGrid({ messages: es })`. */
export const es = {
  loading: 'Cargando…',
  empty: 'No hay datos para mostrar.',
  noMatch: 'Ninguna fila coincide con los filtros actuales.',
  clearFilters: 'Borrar filtros',
  loadError: 'No se pudieron cargar las filas.',
  staleRows: 'Estos datos no están actualizados.',
  retry: 'Reintentar',
  subRowsError: 'No se pudieron cargar las filas.',
  total: 'Total',
  blank: '(vacío)',
  groupRowCount: (count) => rows(count),

  selectAllRows: 'Seleccionar todas las filas',
  selectRow: 'Seleccionar fila',
  selectGroup: 'Seleccionar grupo',
  pageSelected: (count) =>
    plural(count, {
      one: 'La fila de esta página está seleccionada.',
      other: 'Las # filas de esta página están seleccionadas.',
    }),
  selectAllMatching: (total) => `Seleccionar las ${num(total)} filas`,
  allSelected: (total) =>
    plural(total, {
      one: 'La fila está seleccionada.',
      other: 'Las # filas están seleccionadas.',
    }),
  clearSelection: 'Borrar selección',
  expandRow: 'Expandir fila',
  collapseRow: 'Contraer fila',
  expandGroup: 'Expandir grupo',
  collapseGroup: 'Contraer grupo',

  columnMenu: (column) => `Columna ${column}`,
  rowActions: 'Acciones de la fila',
  sortAscending: 'Orden ascendente',
  sortDescending: 'Orden descendente',
  clearSort: 'Quitar orden',
  thenSortAscending: 'Después, orden ascendente',
  thenSortDescending: 'Después, orden descendente',
  sortPosition: (position, dir, count) =>
    `, orden ${position} de ${count}, ${dir === 'asc' ? 'ascendente' : 'descendente'}`,
  filterMenu: 'Filtrar…',
  clearFilter: 'Quitar filtro',
  clearAllFilters: 'Quitar todos los filtros',
  groupBy: (column) => `Agrupar por ${column}`,
  ungroup: 'Desagrupar',
  ungroupAll: 'Desagrupar todo',
  pinLeft: 'Fijar a la izquierda',
  pinRight: 'Fijar a la derecha',
  unpin: 'Desfijar',
  moveLeft: 'Mover a la izquierda',
  moveRight: 'Mover a la derecha',
  fitWidth: 'Ajustar ancho',
  resetWidth: 'Restablecer ancho',
  hideColumn: 'Ocultar columna',
  resetColumns: 'Restablecer columnas',
  resizeColumn: (column) => `Cambiar el ancho de ${column}`,
  columns: 'Columnas',
  filterColumns: 'Filtrar columnas…',
  noMatchingColumns: 'Ninguna columna coincide',
  menu: 'Menú',

  filterColumn: (column) => `Filtrar ${column}`,
  filterColumnActive: (column) => `Filtrar ${column} (activo)`,
  filterPlaceholder: 'Filtrar…',
  filterSummary: (column, summary) => `Filtro ${column}: ${summary}`,
  customFilter: 'Personalizado',
  valuesSelected: (count) => plural(count, { one: '# seleccionado', other: '# seleccionados' }),
  filterCondition: (column) => `${column}: condición`,
  filterValue: 'Valor',
  filterFrom: (column) => `${column}: desde`,
  filterTo: (column) => `${column}: hasta`,
  opContains: 'Contiene',
  opNotContains: 'No contiene',
  opEquals: 'Es igual a',
  opNotEquals: 'No es igual a',
  opStartsWith: 'Empieza por',
  opEndsWith: 'Termina en',
  opEmpty: 'Está vacío',
  opNotEmpty: 'No está vacío',
  opBetween: 'Entre',
  opOn: 'El',
  opBefore: 'Antes de',
  opAfter: 'Después de',
  any: 'Cualquiera',
  yes: 'Sí',
  no: 'No',
  emptyValue: 'Vacío',
  blanks: '(Vacíos)',
  searchValues: 'Buscar valores',
  all: 'Todo',
  allShown: 'Todo lo mostrado',
  moreValues: (count) =>
    plural(count, {
      one: '# más: busque para acotar la lista',
      other: '# más: busque para acotar la lista',
    }),
  noMatchingValues: 'Ningún valor coincide',
  searchPlaceholder: 'Buscar…',
  searchLabel: 'Buscar filas',

  pagination: 'Paginación',
  rowsPerPage: 'Filas por página',
  pageSize: (size) => `${size} / página`,
  pageSummary: (from, to, total) => `${from}–${to} de ${total}`,
  firstPage: 'Primera página',
  previousPage: 'Página anterior',
  nextPage: 'Página siguiente',
  lastPage: 'Última página',
  page: (page) => `Página ${page}`,

  statusBar: 'Estado de la tabla',
  rowCount: (shown, total, count, totalCount) =>
    total === undefined ? rows(count, shown) : `${shown} de ${rows(totalCount ?? count, total)}`,
  selectedCount: (count, all, amount) =>
    all
      ? plural(amount, { one: '# seleccionada', other: 'Todas seleccionadas (#)' }, count)
      : plural(amount, { one: '# seleccionada', other: '# seleccionadas' }, count),
  filterCount: (count) => plural(count, { one: '# filtro', other: '# filtros' }),
  clear: 'Borrar',
  sum: 'Suma',
  average: 'Promedio',
  min: 'Mín.',
  max: 'Máx.',
  cellCount: (count) => plural(count, { one: '# celda', other: '# celdas' }),

  editCell: (column) => `Editar ${column}`,
  editNotANumber: 'Introduzca un número.',
  editOutOfRange: (min, max) =>
    min !== undefined && max !== undefined
      ? `Introduzca un número entre ${num(min)} y ${num(max)}.`
      : min !== undefined
        ? `Introduzca un número mayor o igual que ${num(min)}.`
        : `Introduzca un número menor o igual que ${num(max ?? 0)}.`,
  editSaveFailed: 'No se pudo guardar el cambio.',
  editSaving: 'Guardando…',

  view: 'Ver',
  close: 'Cerrar',
  copy: 'Copiar',
  copied: 'Copiado',
  actions: 'Acciones',
  details: 'Detalles',
  moreInfo: 'Más información',
  moreItems: (count) => `+${num(count)} más`,
  showLess: 'Mostrar menos',
  increased: 'Aumentó',
  decreased: 'Disminuyó',
  toggle: 'Alternar',
  edit: 'Editar',
} satisfies Required<GridMessages>

export default es
