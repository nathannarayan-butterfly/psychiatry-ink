/** Shared ICD display-title types (server proxy + client resolver). */

export type IcdTitleVersion = 'icd10' | 'icd11' | 'dsm'

export type IcdTitleSource = 'who' | 'crosswalk' | 'none'

export interface IcdTitleResult {
  code: string
  version: IcdTitleVersion
  title: string
  language: string
  source: IcdTitleSource
}

export interface IcdTitleLookupItem {
  code: string
  version: IcdTitleVersion
}
