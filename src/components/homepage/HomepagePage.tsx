import { DEMO_CASE_ID } from '../../demo/constants'
import { useHomepageContent } from '../../hooks/useHomepageContent'
import { CTASection } from './CTASection'
import { FeatureCard } from './FeatureCard'
import { HeroSection } from './HeroSection'
import { HomepageFooter } from './HomepageFooter'
import { HomepageNav } from './HomepageNav'
import { DemoPanel } from './DemoPanel'
import { ModulePreviewCard } from './ModulePreviewCard'
import { SecurityPrincipleCard } from './SecurityPrincipleCard'
import { SingleUseTierCard } from './SingleUseTierCard'
import { WorkflowStep } from './WorkflowStep'

export interface HomepagePageProps {
  onLogin: () => void
  onSignup: () => void
  onNavigate: (path: string) => void
  isAuthenticated: boolean
  showDevEntry?: boolean
  onEnterApp?: () => void
}

/** Demo case requires auth — redirect through login when unauthenticated. */
export const DEMO_PATIENT_PATH = `/case/${encodeURIComponent(DEMO_CASE_ID)}?view=overview`

export function HomepagePage({
  onLogin,
  onSignup: _onSignup,
  onNavigate,
  isAuthenticated,
  showDevEntry,
  onEnterApp,
}: HomepagePageProps) {
  const content = useHomepageContent()
  const { pillars, workflow, modules, security, tiers, demo, finalCta } = content

  const openWorkspace = () => {
    if (isAuthenticated) {
      onNavigate('/dashboard')
      return
    }
    if (showDevEntry && onEnterApp) {
      onEnterApp()
      return
    }
    onNavigate('/login?redirect=/dashboard')
  }

  const viewDemoPatient = () => {
    if (isAuthenticated) {
      onNavigate(DEMO_PATIENT_PATH)
      return
    }
    onNavigate(`/login?redirect=${encodeURIComponent(DEMO_PATIENT_PATH)}`)
  }

  return (
    <div className="hp-page">
      <HomepageNav onOpenWorkspace={openWorkspace} />

      <main>
        <HeroSection
          onOpenWorkspace={openWorkspace}
          onViewDemo={viewDemoPatient}
          showDevEntry={showDevEntry}
          onEnterApp={onEnterApp}
        />

        <section
          id={pillars.sectionId}
          className="hp-section"
          aria-labelledby="hp-pillars-title"
        >
          <header className="hp-section__header">
            <p className="hp-eyebrow">{pillars.eyebrow}</p>
            <h2 id="hp-pillars-title" className="hp-section__title">
              {pillars.title}
            </h2>
            <p className="hp-section__lead">{pillars.lead}</p>
          </header>
          <div className="hp-grid hp-grid--3">
            {pillars.cards.map((card) => (
              <FeatureCard key={card.id} title={card.title} description={card.description} />
            ))}
          </div>
        </section>

        <section
          id={workflow.sectionId}
          className="hp-section hp-section--muted"
          aria-labelledby="hp-workflow-title"
        >
          <header className="hp-section__header">
            <p className="hp-eyebrow">{workflow.eyebrow}</p>
            <h2 id="hp-workflow-title" className="hp-section__title">
              {workflow.title}
            </h2>
            <p className="hp-section__lead">{workflow.lead}</p>
          </header>
          <ol className="hp-workflow">
            {workflow.steps.map((step, index) => (
              <WorkflowStep
                key={step.id}
                index={index}
                title={step.title}
                description={step.description}
              />
            ))}
          </ol>
        </section>

        <section
          id={modules.sectionId}
          className="hp-section"
          aria-labelledby="hp-modules-title"
        >
          <header className="hp-section__header">
            <p className="hp-eyebrow">{modules.eyebrow}</p>
            <h2 id="hp-modules-title" className="hp-section__title">
              {modules.title}
            </h2>
            <p className="hp-section__lead">{modules.lead}</p>
          </header>
          <div className="hp-grid hp-grid--modules">
            {modules.cards.map((card) => (
              <ModulePreviewCard
                key={card.id}
                label={card.label}
                title={card.title}
                description={card.description}
              />
            ))}
          </div>
        </section>

        <section
          id={security.sectionId}
          className="hp-section hp-section--muted"
          aria-labelledby="hp-security-title"
        >
          <header className="hp-section__header">
            <p className="hp-eyebrow">{security.eyebrow}</p>
            <h2 id="hp-security-title" className="hp-section__title">
              {security.title}
            </h2>
            <p className="hp-section__lead">{security.lead}</p>
          </header>
          <div className="hp-grid hp-grid--4">
            {security.principles.map((principle) => (
              <SecurityPrincipleCard
                key={principle.id}
                title={principle.title}
                description={principle.description}
              />
            ))}
          </div>
        </section>

        <section
          id={tiers.sectionId}
          className="hp-section"
          aria-labelledby="hp-pricing-title"
        >
          <header className="hp-section__header">
            <p className="hp-eyebrow">{tiers.eyebrow}</p>
            <h2 id="hp-pricing-title" className="hp-section__title">
              {tiers.title}
            </h2>
            <p className="hp-section__lead">{tiers.lead}</p>
          </header>
          <div className="hp-pricing">
            <div className="hp-pricing__stack">
              <SingleUseTierCard content={tiers.singleUse} onCta={openWorkspace} />
              <p className="hp-pricing__coming-soon">{tiers.comingSoonNote}</p>
            </div>
          </div>
        </section>

        <section
          id={demo.sectionId}
          className="hp-section hp-section--muted"
          aria-labelledby="hp-demo-title"
        >
          <header className="hp-section__header">
            <p className="hp-eyebrow">{demo.eyebrow}</p>
            <h2 id="hp-demo-title" className="hp-section__title">
              {demo.title}
            </h2>
            <p className="hp-section__lead">{demo.lead}</p>
          </header>
          <div className="hp-demo-panels">
            {demo.panels.map((panel) => (
              <DemoPanel key={panel.id} panel={panel} />
            ))}
          </div>
        </section>

        <CTASection
          title={finalCta.title}
          subtitle={finalCta.subtitle}
          primaryCta={finalCta.primaryCta}
          secondaryCta={finalCta.secondaryCta}
          onPrimary={openWorkspace}
          onSecondary={viewDemoPatient}
        />
      </main>

      <HomepageFooter onLogin={onLogin} />
    </div>
  )
}
