import { useTranslation } from '../../context/TranslationContext'
import type { AiToolKey } from '../../data/aiTools'

const SECTION_QUICK_AI_TOOLS: AiToolKey[] = ['expand', 'proofread', 'structure', 'formalize']

interface NotionSectionAiLinksProps {
  onAiTool: (tool: AiToolKey) => void
}

export function NotionSectionAiLinks({ onAiTool }: NotionSectionAiLinksProps) {
  const { t } = useTranslation()

  const getSectionAiLabel = (tool: AiToolKey) => {
    if (tool === 'expand') return t('notionSectionAiImprove')
    return t(tool)
  }

  return (
    <div className="notion-editor__section-ai">
      {SECTION_QUICK_AI_TOOLS.map((tool, index) => (
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
