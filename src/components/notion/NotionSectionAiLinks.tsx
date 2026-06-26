import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'

const SECTION_QUICK_AI_TOOLS: AiToolKey[] = ['expand', 'proofread', 'structure', 'formalize']

/**
 * Improve-only set for sections whose KI must polish wording without ever
 * interpreting (Psychopathologischer Befund — Item 8). No `structure`/`expand`
 * so the model cannot impose AMDP structure or add clinical content.
 */
export const IMPROVE_ONLY_SECTION_AI_TOOLS: AiToolKey[] = ['improve', 'proofread']

interface NotionSectionAiLinksProps {
  onAiTool: (tool: AiToolKey) => void
  tools?: AiToolKey[]
}

export function NotionSectionAiLinks({ onAiTool, tools }: NotionSectionAiLinksProps) {
  const { t } = useTranslation()
  const quickTools = tools ?? SECTION_QUICK_AI_TOOLS

  const getSectionAiLabel = (tool: AiToolKey) => {
    if (tool === 'expand') return t('notionSectionAiImprove')
    return t(tool)
  }

  return (
    <div className="notion-editor__section-ai">
      {quickTools.map((tool, index) => (
        <span key={tool} className="notion-editor__section-ai-item">
          {index > 0 ? (
            <span className="notion-editor__section-ai-sep" aria-hidden>
              ·
            </span>
          ) : null}
          <button
            type="button"
            className="notion-editor__section-ai-link"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onAiTool(tool)}
          >
            {getSectionAiLabel(tool)}
          </button>
        </span>
      ))}
    </div>
  )
}
