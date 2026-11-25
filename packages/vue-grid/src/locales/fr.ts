import type { GridMessages } from '../types'
import { packHelpers } from './plural'

const { num, plural } = packHelpers('fr')
const rows = (n: number, shown?: string) => plural(n, { one: '# ligne', other: '# lignes' }, shown)

/** Français. `messages: fr` (per grid) or `createVueGrid({ messages: fr })`. */
export const fr = {
  loading: 'Chargement…',
  empty: 'Aucune donnée à afficher.',
  noMatch: 'Aucune ligne ne correspond aux filtres actuels.',
  clearFilters: 'Effacer les filtres',
  loadError: 'Impossible de charger les lignes.',
  staleRows: 'Ces données ne sont pas à jour.',
  retry: 'Réessayer',
  subRowsError: 'Impossible de charger les lignes.',
  total: 'Total',
  blank: '(vide)',
  groupRowCount: (count) => rows(count),

  selectAllRows: 'Sélectionner toutes les lignes',
  selectRow: 'Sélectionner la ligne',
  selectGroup: 'Sélectionner le groupe',
  pageSelected: (count) =>
    plural(count, {
      one: 'La ligne de cette page est sélectionnée.',
      other: 'Les # lignes de cette page sont sélectionnées.',
    }),
  selectAllMatching: (total) => `Sélectionner les ${num(total)} lignes`,
  allSelected: (total) =>
    plural(total, {
      one: 'La ligne est sélectionnée.',
      other: 'Les # lignes sont sélectionnées.',
    }),
  clearSelection: 'Effacer la sélection',
  expandRow: 'Développer la ligne',
  collapseRow: 'Réduire la ligne',
  expandGroup: 'Développer le groupe',
  collapseGroup: 'Réduire le groupe',

  columnMenu: (column) => `Colonne ${column}`,
  rowActions: 'Actions sur la ligne',
  sortAscending: 'Trier par ordre croissant',
  sortDescending: 'Trier par ordre décroissant',
  clearSort: 'Annuler le tri',
  thenSortAscending: 'Puis trier par ordre croissant',
  thenSortDescending: 'Puis trier par ordre décroissant',
  sortPosition: (position, dir, count) =>
    `, tri ${position} sur ${count}, ${dir === 'asc' ? 'croissant' : 'décroissant'}`,
  filterMenu: 'Filtrer…',
  clearFilter: 'Effacer le filtre',
  clearAllFilters: 'Effacer tous les filtres',
  groupBy: (column) => `Grouper par ${column}`,
  ungroup: 'Dégrouper',
  ungroupAll: 'Tout dégrouper',
  pinLeft: 'Épingler à gauche',
  pinRight: 'Épingler à droite',
  unpin: 'Désépingler',
  moveLeft: 'Déplacer vers la gauche',
  moveRight: 'Déplacer vers la droite',
  fitWidth: 'Ajuster la largeur',
  resetWidth: 'Rétablir la largeur',
  hideColumn: 'Masquer la colonne',
  resetColumns: 'Rétablir les colonnes',
  resizeColumn: (column) => `Redimensionner ${column}`,
  columns: 'Colonnes',
  filterColumns: 'Filtrer les colonnes…',
  noMatchingColumns: 'Aucune colonne correspondante',
  menu: 'Menu',

  filterColumn: (column) => `Filtrer ${column}`,
  filterColumnActive: (column) => `Filtrer ${column} (actif)`,
  filterPlaceholder: 'Filtrer…',
  filterSummary: (column, summary) => `Filtre ${column} : ${summary}`,
  customFilter: 'Personnalisé',
  valuesSelected: (count) => plural(count, { one: '# sélectionnée', other: '# sélectionnées' }),
  filterCondition: (column) => `${column} : condition`,
  filterValue: 'Valeur',
  filterFrom: (column) => `${column} : de`,
  filterTo: (column) => `${column} : à`,
  opContains: 'Contient',
  opNotContains: 'Ne contient pas',
  opEquals: 'Égal à',
  opNotEquals: 'Différent de',
  opStartsWith: 'Commence par',
  opEndsWith: 'Se termine par',
  opEmpty: 'Est vide',
  opNotEmpty: "N'est pas vide",
  opBetween: 'Entre',
  opOn: 'Le',
  opBefore: 'Avant',
  opAfter: 'Après',
  any: 'Tous',
  yes: 'Oui',
  no: 'Non',
  emptyValue: 'Vide',
  blanks: '(Vides)',
  searchValues: 'Rechercher des valeurs',
  all: 'Tout',
  allShown: 'Tout ce qui est affiché',
  moreValues: (count) =>
    plural(count, {
      one: '# autre – recherchez pour réduire la liste',
      other: '# autres – recherchez pour réduire la liste',
    }),
  noMatchingValues: 'Aucune valeur correspondante',
  searchPlaceholder: 'Rechercher…',
  searchLabel: 'Rechercher des lignes',

  pagination: 'Pagination',
  rowsPerPage: 'Lignes par page',
  pageSize: (size) => `${size} / page`,
  pageSummary: (from, to, total) => `${from}–${to} sur ${total}`,
  firstPage: 'Première page',
  previousPage: 'Page précédente',
  nextPage: 'Page suivante',
  lastPage: 'Dernière page',
  page: (page) => `Page ${page}`,

  statusBar: 'État de la grille',
  rowCount: (shown, total, count, totalCount) =>
    total === undefined ? rows(count, shown) : `${shown} sur ${rows(totalCount ?? count, total)}`,
  selectedCount: (count, all, amount) =>
    all
      ? plural(amount, { one: '# sélectionnée', other: 'Toutes sélectionnées (#)' }, count)
      : plural(amount, { one: '# sélectionnée', other: '# sélectionnées' }, count),
  filterCount: (count) => plural(count, { one: '# filtre', other: '# filtres' }),
  clear: 'Effacer',
  sum: 'Somme',
  average: 'Moyenne',
  min: 'Min.',
  max: 'Max.',
  cellCount: (count) => plural(count, { one: '# cellule', other: '# cellules' }),

  find: 'Rechercher',
  replaceWith: 'Remplacer par',
  matchCase: 'Respecter la casse',
  wholeCell: 'Cellule entière',
  inSelection: 'Dans la sélection',
  findNext: 'Résultat suivant',
  findPrevious: 'Résultat précédent',
  showReplace: 'Remplacer…',
  replace: 'Remplacer',
  replaceAll: 'Tout remplacer',
  findCount: (current, total) => `${current} sur ${total}`,
  noMatches: 'Aucun résultat',
  replacedCount: (count, skipped) =>
    plural(count, { one: '# remplacée', other: '# remplacées' }) +
    (skipped ? `, ${plural(skipped, { one: '# inchangée', other: '# inchangées' })}` : ''),

  editCell: (column) => `Modifier ${column}`,
  editNotANumber: 'Saisissez un nombre.',
  editOutOfRange: (min, max) =>
    min !== undefined && max !== undefined
      ? `Saisissez un nombre entre ${num(min)} et ${num(max)}.`
      : min !== undefined
        ? `Saisissez un nombre supérieur ou égal à ${num(min)}.`
        : `Saisissez un nombre inférieur ou égal à ${num(max ?? 0)}.`,
  editSaveFailed: "Impossible d'enregistrer la modification.",
  editSaving: 'Enregistrement…',

  view: 'Voir',
  close: 'Fermer',
  copy: 'Copier',
  copied: 'Copié',
  actions: 'Actions',
  details: 'Détails',
  moreInfo: "Plus d'informations",
  moreItems: (count) => `+${num(count)} de plus`,
  showLess: 'Afficher moins',
  increased: 'En hausse',
  decreased: 'En baisse',
  toggle: 'Basculer',
  edit: 'Modifier',
} satisfies Required<GridMessages>

export default fr
