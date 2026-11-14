/** What the repairs screen keeps in the address bar: the repair that is open, and whether the report flow is. */
export interface RepairsSearch {
  ticket?: string
  report?: boolean
}

export function parseRepairsSearch(search: Record<string, unknown>): RepairsSearch {
  return {
    ticket: typeof search.ticket === 'string' && search.ticket ? search.ticket : undefined,
    report: search.report === true || search.report === 'true' ? true : undefined,
  }
}
