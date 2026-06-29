import { MessageSquare, NotebookPen } from 'lucide-react'
import { useTranslation } from '../../context/TranslationContext'
import { useAskButterfly } from '../../contexts/AskButterflyContext'
import { useKbPharmaComments } from '../../contexts/KbPharmaCommentsContext'
import { useNotizen } from '../../contexts/NotizenContext'
import { ButterflyLogo } from '../ButterflyLogo'

/**
 * Stacked bottom-right floating action buttons available on every route: KB
 * Kommentare (when a pharma drug detail is active), Notizen, and Ask Butterfly.
 * Rendered once in the global app shell so it is the single, consistent entry
 * point across the app.
 */
export function FloatingToolsFab() {
  const { t } = useTranslation()
  const butterfly = useAskButterfly()
  const notizen = useNotizen()
  const kbComments = useKbPharmaComments()

  return (
    <div className="floating-tools-fab">
      {kbComments.isRegistered ? (
        <button
          type="button"
          className={`floating-tools-fab__btn floating-tools-fab__btn--comments${kbComments.isOpen ? ' floating-tools-fab__btn--active' : ''}`}
          onClick={() => (kbComments.isOpen ? kbComments.close() : kbComments.open())}
          title={t('kbCommentsPanelTitle')}
          aria-label={t('kbCommentsPanelTitle')}
        >
          <MessageSquare className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        className={`floating-tools-fab__btn floating-tools-fab__btn--notizen${notizen.isOpen ? ' floating-tools-fab__btn--active' : ''}`}
        onClick={notizen.open}
        title={t('notizenOpen')}
        aria-label={t('notizenOpen')}
      >
        <NotebookPen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        className={`floating-tools-fab__btn floating-tools-fab__btn--butterfly${butterfly.isOpen ? ' floating-tools-fab__btn--active' : ''}`}
        onClick={butterfly.open}
        title={t('askButterflyOpen')}
        aria-label={t('askButterflyOpen')}
      >
        <ButterflyLogo variant="grey" tone="color" breathing size={24} />
      </button>
    </div>
  )
}
