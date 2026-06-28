/** Curated languages for AI translation (ISO 639-1 codes + native display names). */
export interface AiTranslationLanguage {
  code: string
  nativeName: string
  englishName: string
}

export const AI_TRANSLATION_LANGUAGES: AiTranslationLanguage[] = [
  { code: 'de', nativeName: 'Deutsch', englishName: 'German' },
  { code: 'en', nativeName: 'English', englishName: 'English' },
  { code: 'fr', nativeName: 'Français', englishName: 'French' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese' },
  { code: 'nl', nativeName: 'Nederlands', englishName: 'Dutch' },
  { code: 'pl', nativeName: 'Polski', englishName: 'Polish' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian' },
  { code: 'uk', nativeName: 'Українська', englishName: 'Ukrainian' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi' },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish' },
  { code: 'da', nativeName: 'Dansk', englishName: 'Danish' },
  { code: 'no', nativeName: 'Norsk', englishName: 'Norwegian' },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish' },
  { code: 'cs', nativeName: 'Čeština', englishName: 'Czech' },
  { code: 'hu', nativeName: 'Magyar', englishName: 'Hungarian' },
  { code: 'ro', nativeName: 'Română', englishName: 'Romanian' },
  { code: 'el', nativeName: 'Ελληνικά', englishName: 'Greek' },
  { code: 'he', nativeName: 'עברית', englishName: 'Hebrew' },
  { code: 'fa', nativeName: 'فارسی', englishName: 'Persian' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese' },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay' },
]

export function findTranslationLanguage(code: string): AiTranslationLanguage | undefined {
  return AI_TRANSLATION_LANGUAGES.find((lang) => lang.code === code)
}

export function translationLanguageLabel(code: string): string {
  return findTranslationLanguage(code)?.nativeName ?? code
}
