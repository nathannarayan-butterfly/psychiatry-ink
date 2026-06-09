import type { WorkspaceComponentTemplate } from '../types/workspaceSettings'

export { DEFAULT_COMPONENT_IDS, isDefaultComponent } from '../utils/defaultComponents'
import {
  aufnahmeComponentAi,
  freeTextDocumentAi,
  psychopathChecklistVariantAi,
  psychopathFreeVariantAi,
  therapieVerlaufComponentAi,
  verlaufBroadVariantAi,
  verlaufShortVariantAi,
} from './aiManagerPresets'
import { cloneAufnahmeSections } from './aufnahmeSections'
import { clonePsychopathSections } from './psychopathSections'
import { cloneVerlaufBroadSections } from './verlaufSections'

export const defaultWorkspaceComponents: WorkspaceComponentTemplate[] = [
  {
    id: 'aufnahme',
    label: 'Aufnahme',
    railHeading: 'Aufnahme',
    icon: 'clipboard',
    multistage: true,
    sections: cloneAufnahmeSections(),
    ai: aufnahmeComponentAi,
  },
  {
    id: 'verlauf',
    label: 'Verlauf',
    icon: 'file-text',
    multistage: false,
    sections: [],
    defaultVariantId: 'short',
    variants: [
      {
        id: 'short',
        label: 'Kurznotiz',
        mode: 'free',
        multistage: false,
        sections: [],
        ai: verlaufShortVariantAi,
      },
      {
        id: 'broad',
        label: 'Breiter Verlauf',
        railHeading: 'Verlauf',
        mode: 'sections',
        multistage: true,
        sections: cloneVerlaufBroadSections(),
        ai: verlaufBroadVariantAi,
      },
    ],
  },
  {
    id: 'psychopath',
    label: 'Psychopathologischer Befund, AMDP-orientiert',
    toolLabelLines: ['Psycho-', 'pathologie'],
    icon: 'brain',
    multistage: false,
    sections: [],
    defaultVariantId: 'free',
    variants: [
      {
        id: 'free',
        label: 'Freitext',
        mode: 'free',
        multistage: false,
        sections: [],
        ai: psychopathFreeVariantAi,
      },
      {
        id: 'checklist',
        label: 'AMDP-Checkliste',
        railHeading: 'Psychopathologie',
        mode: 'checklist',
        multistage: true,
        sections: clonePsychopathSections(),
        ai: psychopathChecklistVariantAi,
      },
      {
        id: 'isdm',
        label: 'ISDM V.1',
        mode: 'isdm',
        multistage: false,
        sections: [],
        ai: psychopathFreeVariantAi,
      },
    ],
  },
  {
    id: 'therapie-verlauf',
    label: 'Arztbrief',
    railHeading: 'Arztbrief',
    icon: 'activity',
    multistage: false,
    prefilledText: '',
    sections: [],
    ai: therapieVerlaufComponentAi,
  },
  {
    id: 'medikation',
    label: 'Medikation',
    railHeading: 'Medikation',
    icon: 'pill',
    multistage: false,
    sections: [],
    ai: freeTextDocumentAi,
  },
  {
    id: 'therapieplanung',
    label: 'Therapieplanung',
    railHeading: 'Therapieplanung',
    icon: 'message-square',
    multistage: false,
    sections: [],
    ai: freeTextDocumentAi,
  },
]
