/**
 * Reading and checking a rent roll before a single row is imported.
 *
 * Every row goes through the same rules engine the rest of the product uses:
 * the rent must be one figure (`parseAdvertisedRent` refuses ranges and
 * "negotiable"), the bond must be within the cap (`checkBond`), and the
 * addresses the invites will go to must be addresses. A row with a problem is
 * left out and listed, with the problem written as a sentence someone at the
 * agency can act on.
 */
import Papa from 'papaparse'
import type { ISODate, Property } from '@/domain/types'
import type { JurisdictionPack } from '@/domain/jurisdictions/types'
import { parseAdvertisedRent } from '@/domain/rules/text'
import { checkBond } from '@/domain/rules/tenancy'
import type { ImportRow } from '@/data/admin-mutations'

export const COLUMNS = [
  { key: 'address', required: true, example: '12 Kōtuku Lane' },
  { key: 'suburb', required: true, example: 'Stoke' },
  { key: 'city', required: true, example: 'Nelson' },
  { key: 'postcode', required: true, example: '7011' },
  { key: 'property_type', required: false, example: 'house, townhouse, unit or apartment' },
  { key: 'bedrooms', required: true, example: '3' },
  { key: 'weekly_rent', required: true, example: '560' },
  { key: 'bond', required: true, example: '2240' },
  { key: 'bond_reference', required: false, example: 'BND-5512-0931' },
  { key: 'tenancy_start', required: true, example: '2025-03-14' },
  { key: 'tenant_name', required: true, example: 'Ana Tuilagi' },
  { key: 'tenant_email', required: true, example: 'ana.tuilagi@example.nz' },
  { key: 'landlord_name', required: true, example: 'Rob Kirkwood' },
  { key: 'landlord_email', required: true, example: 'rob.kirkwood@example.nz' },
] as const

type ColumnKey = (typeof COLUMNS)[number]['key']

/**
 * A sample rent roll. The people and addresses are invented. Three rows carry
 * the mistakes a real rent roll usually has, so the checks have something to
 * find: a rent given as a range, a bond above the cap, and a mistyped email.
 */
export const SAMPLE_CSV = [
  COLUMNS.map((c) => c.key).join(','),
  '4 Kōtuku Lane,Nelson Central,Nelson,7010,townhouse,2,540,2160,BND-5512-0931,2024-08-19,Ana Tuilagi,ana.tuilagi@example.nz,Rob Kirkwood,rob.kirkwood@example.nz',
  '31 Harakeke Street,Atawhai,Nelson,7010,house,3,620,2480,BND-5540-2204,2023-11-06,Joss Hartley,joss.hartley@example.nz,Meera Nair,meera.nair@example.nz',
  '2/18 Old Wharf Road,Tāhunanui,Nelson,7011,unit,2,$470-$490,1880,BND-6001-7718,2025-02-03,Piripi Waaka,piripi.waaka@example.nz,Colin Baxter,colin.baxter@example.nz',
  '9 Ridgeline Drive,Richmond,Tasman,7020,house,4,710,2840,,2025-06-23,Selina Ah Kuoi,selina.ahkuoi@example.nz,Tessa Lindsay,tessa.lindsay@example.nz',
  '17 Miro Terrace,Stoke,Nelson,7011,house,3,580,2900,BND-5733-4410,2024-01-15,Marek Novak,marek.novak@example.nz,Hinemoa Paki,hinemoa.paki@example.nz',
  '6 Quarry Hill Road,Richmond,Tasman,7020,house,3,595,2380,BND-5820-1166,2022-09-12,Dana Whitfield,dana.whitfield@example,Graham Sole,graham.sole@example.nz',
  '5/40 Pāteke Way,The Wood,Nelson,7010,apartment,1,410,1640,BND-6120-3085,2025-09-01,Tomasi Latu,tomasi.latu@example.nz,Ingrid Voss,ingrid.voss@example.nz',
  '22 Windmill Lane,Stoke,Nelson,7011,house,3,565,2260,BND-5466-9027,2023-04-24,Bex Morrow,bex.morrow@example.nz,Sione Faleafa,sione.faleafa@example.nz',
].join('\n')

export interface RowProblem {
  field: string
  /** A sentence that says what is wrong and what would fix it. */
  problem: string
  /** A blocking problem keeps the row out of the import. A note does not. */
  blocks: boolean
}

export interface CheckedRow {
  /** The row's number in the file, counting the first data row as 1. */
  row: number
  raw: Partial<Record<ColumnKey, string>>
  problems: RowProblem[]
  /** Set when nothing blocks the row. */
  value?: ImportRow
}

export interface Checked {
  rows: CheckedRow[]
  ready: ImportRow[]
  /** Required columns the file does not have. With any of these, nothing can be checked. */
  missingColumns: string[]
  ignoredColumns: string[]
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const KINDS: Property['kind'][] = ['house', 'townhouse', 'unit', 'apartment']

function calendarDate(y: number, m: number, d: number): ISODate | null {
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Reads `2025-03-14` or the day-first `14/03/2025` a New Zealand spreadsheet exports. */
export function readDate(input: string): ISODate | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input.trim())
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  const dayFirst = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(input.trim())
  if (dayFirst) return calendarDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]))
  return null
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
export const addressKey = (line1: string, suburb: string) => `${fold(line1)}|${fold(suburb)}`

export function checkRentRoll(csv: string, pack: JurisdictionPack, today: ISODate, onPlatform: Set<string>): Checked {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_') })
  const fields = parsed.meta.fields ?? []
  const known = COLUMNS.map((c) => c.key) as string[]
  const missingColumns = COLUMNS.filter((c) => c.required && !fields.includes(c.key)).map((c) => c.key)
  const ignoredColumns = fields.filter((f) => f && !known.includes(f))
  if (missingColumns.length) return { rows: [], ready: [], missingColumns, ignoredColumns }

  const seen = new Map<string, number>()
  const rows: CheckedRow[] = parsed.data.map((record, i) => {
    const raw = Object.fromEntries(known.map((k) => [k, (record[k] ?? '').trim()])) as Record<ColumnKey, string>
    const problems: RowProblem[] = []
    const block = (field: ColumnKey, problem: string) => problems.push({ field, problem, blocks: true })

    for (const c of COLUMNS) if (c.required && !raw[c.key]) block(c.key, `Empty. Every row needs ${c.key === 'address' ? 'an address' : `its ${c.key.replace(/_/g, ' ')}`}.`)

    const kind = raw.property_type ? (KINDS.find((k) => k === raw.property_type.toLowerCase()) ?? null) : 'house'
    if (kind === null) block('property_type', `Reads “${raw.property_type}”. It has to be house, townhouse, unit or apartment.`)

    const beds = Number(raw.bedrooms)
    if (raw.bedrooms && (!Number.isInteger(beds) || beds < 1 || beds > 12)) block('bedrooms', `Reads “${raw.bedrooms}”. Give the number of bedrooms as a whole number.`)

    let rent: number | undefined
    if (raw.weekly_rent) {
      const verdict = parseAdvertisedRent(pack, raw.weekly_rent)
      if (verdict.ok && verdict.amount !== undefined) rent = verdict.amount
      else block('weekly_rent', `Reads “${raw.weekly_rent}”. ${verdict.reason ?? 'A rent must be one figure.'}${verdict.fix ? ` ${verdict.fix}` : ''}`)
    }

    let bond: number | undefined
    if (raw.bond) {
      const n = Number(raw.bond.replace(/[$,\s]/g, ''))
      if (!Number.isFinite(n) || n < 0) block('bond', `Reads “${raw.bond}”. Give the bond held as a dollar amount, or 0 if none was taken.`)
      else {
        bond = n
        if (rent !== undefined) {
          const verdict = checkBond(pack, rent, n)
          if (!verdict.ok) block('bond', `${verdict.reason ?? 'The bond is above the cap.'}${verdict.fix ? ` ${verdict.fix}` : ''} The difference has to be refunded before this tenancy comes across.`)
        }
      }
    }

    let start: ISODate | undefined
    if (raw.tenancy_start) {
      const date = readDate(raw.tenancy_start)
      if (!date) block('tenancy_start', `Reads “${raw.tenancy_start}”, which is not a date. Write it as 2025-03-14 or 14/03/2025.`)
      else if (date > today) block('tenancy_start', `Is in the future. A rent roll lists tenancies that have already begun; add this one when it starts.`)
      else start = date
    }

    if (raw.tenant_email && !EMAIL.test(raw.tenant_email)) block('tenant_email', `“${raw.tenant_email}” is not an email address, so the tenant’s Pool invite would have nowhere to go.`)
    if (raw.landlord_email && !EMAIL.test(raw.landlord_email)) block('landlord_email', `“${raw.landlord_email}” is not an email address, so the founding invite would have nowhere to go.`)

    if (raw.address && raw.suburb) {
      const key = addressKey(raw.address, raw.suburb)
      const earlier = seen.get(key)
      if (earlier !== undefined) block('address', `The same address is on row ${earlier}. A home has one live tenancy; keep the current one.`)
      else if (onPlatform.has(key)) block('address', 'This home is already on the platform. Importing it again would give it two tenancies.')
      else seen.set(key, i + 1)
    }

    if (bond !== undefined && bond > 0 && !raw.bond_reference) problems.push({ field: 'bond_reference', problem: 'No bond reference. The row can be imported; the bond will show as not yet lodged until a Bond Hub reference is added.', blocks: false })

    const blocked = problems.some((p) => p.blocks)
    const value: ImportRow | undefined =
      !blocked && kind && rent !== undefined && bond !== undefined && start
        ? { address: raw.address, suburb: raw.suburb, city: raw.city, postcode: raw.postcode, kind, beds, weeklyRent: rent, bond, bondRef: raw.bond_reference || undefined, startDate: start, tenantName: raw.tenant_name, tenantEmail: raw.tenant_email, landlordName: raw.landlord_name, landlordEmail: raw.landlord_email }
        : undefined
    return { row: i + 1, raw, problems, value }
  })

  return { rows, ready: rows.flatMap((r) => (r.value ? [r.value] : [])), missingColumns, ignoredColumns }
}
