import React, {useMemo, useState} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Keyboard,
  Lightbulb,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import {cn} from '../../lib/utils'

type OnboardingStep = {
  title: string
  description: string
  bullets: string[]
}

type WelcomeOnboardingProps = {
  userName?: string
  tipOfTheDay: string
  onComplete: () => void
}

const steps: OnboardingStep[] = [
  {
    title: 'Welcome to your private AI workspace',
    description: 'DocChat turns every PDF into an interactive knowledge surface with chat, citations, and memory.',
    bullets: ['Premium onboarding for first-time users', 'Smooth guided transition into the dashboard', 'Built for focused document exploration'],
  },
  {
    title: 'How the platform works',
    description: 'Upload a PDF, ask questions in natural language, and jump directly to supporting pages.',
    bullets: ['Upload PDFs from the sidebar or the main drop zone', 'Ask for summaries, headings, or deep extraction', 'Open cited pages with one click'],
  },
  {
    title: 'Power-user shortcuts',
    description: 'You can move fast without leaving the chat flow.',
    bullets: ['Enter sends a message', 'Shift+Enter keeps a new line', 'Use citations to jump back into the source PDF'],
  },
]

const featureCards = [
  { icon: UploadCloud, title: 'Upload PDFs', detail: 'Secure drag and drop with progress feedback.' },
  { icon: BrainCircuit, title: 'Ask AI questions', detail: 'Summaries, analysis, extraction, and follow-ups.' },
  { icon: BookOpen, title: 'Citations', detail: 'Jump to exact pages with interactive source chips.' },
  { icon: ClipboardList, title: 'Memory chat', detail: 'Resume conversations around the same collection.' },
]

const particlePositions = [
  'left-[12%] top-[12%]',
  'right-[16%] top-[18%]',
  'left-[10%] bottom-[20%]',
  'right-[12%] bottom-[16%]',
  'left-1/2 top-[8%]',
  'left-[20%] top-[58%]',
]

export const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({userName, tipOfTheDay, onComplete}) => {
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = steps[stepIndex]
  const isFinalStep = stepIndex === steps.length - 1

  const progressLabel = useMemo(() => `${stepIndex + 1} / ${steps.length}`, [stepIndex])

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
      >
        <motion.div
          className="absolute inset-0 bg-background/80 backdrop-blur-2xl"
          initial={{opacity: 0}}
          animate={{opacity: 1}}
          exit={{opacity: 0}}
        />

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particlePositions.map((position, idx) => (
            <motion.span
              key={position}
              className={cn('absolute h-2 w-2 rounded-full bg-primary/70 shadow-[0_0_30px_rgba(172,199,255,0.45)]', position)}
              initial={{opacity: 0, scale: 0.7}}
              animate={{opacity: [0.2, 1, 0.2], y: [0, -18, 0], scale: [0.8, 1.15, 0.8]}}
              transition={{duration: 3.2 + idx * 0.15, repeat: Infinity, ease: 'easeInOut'}}
            />
          ))}
        </div>

        <motion.div
          initial={{scale: 0.96, y: 18, opacity: 0}}
          animate={{scale: 1, y: 0, opacity: 1}}
          exit={{scale: 0.98, opacity: 0}}
          transition={{type: 'spring', stiffness: 120, damping: 18}}
          className="relative w-full max-w-4xl overflow-hidden rounded-[32px] border border-white/10 bg-white/8 shadow-[0_40px_140px_rgba(0,0,0,0.45)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-primary/10" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

          <div className="relative grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                    <Sparkles size={14} />
                    Welcome sequence
                  </div>
                  <div>
                    <h2 className="font-headline text-4xl italic text-white sm:text-5xl">
                      {userName ? `Welcome, ${userName}` : 'Welcome to DocChat'}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant sm:text-base">
                      {currentStep.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onComplete}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-on-surface-variant transition hover:bg-white/10 hover:text-white"
                  aria-label="Skip onboarding"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-outline">
                <span className="rounded-full bg-white/5 px-3 py-1 text-primary">Step {progressLabel}</span>
                <span>•</span>
                <span>Guided onboarding</span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {featureCards.map(({icon: Icon, title, detail}) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-surface-container-high/70 p-4 backdrop-blur-xl">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Icon size={18} />
                    </div>
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="mt-1 text-xs leading-6 text-on-surface-variant">{detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-surface-container-high/60 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-outline">
                  <Lightbulb size={14} />
                  Tip of the day
                </div>
                <p className="mt-3 text-sm leading-7 text-on-surface">{tipOfTheDay}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {currentStep.bullets.map((bullet) => (
                  <div key={bullet} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-on-surface-variant">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Upload PDFs</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Citations</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Memory chat</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Keyboard shortcuts</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onComplete}
                    className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-on-surface-variant transition hover:bg-white/10 hover:text-white"
                  >
                    Skip tutorial
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isFinalStep) {
                        onComplete()
                        return
                      }
                      setStepIndex((value) => Math.min(value + 1, steps.length - 1))
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-[0_0_35px_rgba(172,199,255,0.3)] transition hover:translate-y-[-1px] hover:shadow-[0_0_40px_rgba(172,199,255,0.4)]"
                  >
                    {isFinalStep ? 'Start exploring' : 'Next'}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-background/40 p-6 sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="rounded-[28px] border border-white/10 bg-surface-container-high/80 p-5 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-[0.3em] text-outline">Quick tour</div>
                    <div className="mt-1 text-lg font-semibold text-white">What happens next</div>
                  </div>
                  <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Guided
                  </div>
                </div>

                <div className="space-y-3">
                  {steps.map((step, idx) => {
                    const active = idx === stepIndex
                    return (
                      <button
                        type="button"
                        key={step.title}
                        onClick={() => setStepIndex(idx)}
                        className={cn(
                          'w-full rounded-2xl border p-4 text-left transition',
                          active
                            ? 'border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(172,199,255,0.12)]'
                            : 'border-white/10 bg-white/5 hover:bg-white/8'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold', active ? 'bg-primary text-on-primary' : 'bg-white/10 text-white')}>
                            {idx + 1}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-white">{step.title}</div>
                            <div className="mt-1 text-xs leading-6 text-on-surface-variant">{step.description}</div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-background/50 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-outline">
                    <Keyboard size={14} />
                    Shortcut hints
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-on-surface-variant">
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Send message</span>
                      <span className="rounded-lg border border-white/10 bg-background/70 px-2 py-1 text-xs text-white">Enter</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>New line</span>
                      <span className="rounded-lg border border-white/10 bg-background/70 px-2 py-1 text-xs text-white">Shift + Enter</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                      <span>Jump to source</span>
                      <span className="rounded-lg border border-white/10 bg-background/70 px-2 py-1 text-xs text-white">Citation chips</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default WelcomeOnboarding
