import React, {useEffect, useMemo, useRef} from 'react'
import {AnimatePresence, motion} from 'framer-motion'
import {Bot, BookOpen, FileText, Sparkles, User} from 'lucide-react'
import AnimatedMarkdown from './AnimatedMarkdown'
import {useChatStore} from '../../store/useChatStore'
import {useUiStore} from '../../store/useUiStore'
import {formatSource} from '../../lib/utils'

const starterPrompts = ['Summarize this document', 'Extract the main headings', 'Find the key insights', 'List any action items']

const tipOptions = [
    'Use citation chips to jump directly to the supporting PDF page.',
    'Ask follow-up questions like “compare section 2 and section 5”.',
    'Press Enter to send and Shift+Enter for a new line.',
]

const MessageList = () => {
    const {messages, loading, activeCollection} = useChatStore()
    const {setPdfPage} = useUiStore()
    const bottomRef = useRef<HTMLDivElement>(null)

    const tipOfTheDay = useMemo(() => tipOptions[new Date().getDate() % tipOptions.length], [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: 'smooth'})
    }, [messages, loading])

    if (messages.length === 0) {
        return (
            <div className="flex h-full flex-col justify-center px-4 py-10 text-center md:px-8">
                <motion.div
                    initial={{scale: 0.9, opacity: 0}}
                    animate={{scale: 1, opacity: 1}}
                    className="relative mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-surface-container-low/80 shadow-[0_0_40px_rgba(172,199,255,0.12)]"
                >
                    <Bot size={40} className="text-primary" />
                    <motion.div
                        className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-primary"
                        animate={{opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9]}}
                        transition={{repeat: Infinity, duration: 1.8}}
                    />
                </motion.div>

                <h3 className="font-headline text-4xl tracking-tight text-white md:text-5xl">Ask anything about your PDF</h3>
                <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant md:text-base">
                    {activeCollection ? `I've analyzed ${activeCollection.filename}. Start with a quick action or ask a precise follow-up question.` : 'Upload a PDF, then ask me anything about it.'}
                </p>

                <div className="mx-auto mt-8 grid max-w-5xl gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[28px] border border-white/10 bg-surface-container-high/70 p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-outline">
                            <Sparkles size={14} />
                            Quick actions
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            {starterPrompts.map((question) => (
                                <button
                                    key={question}
                                    onClick={() => window.dispatchEvent(new CustomEvent('send-message', {detail: question}))}
                                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-on-surface transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10 hover:text-white"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-surface-container-high/70 p-5 text-left shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-outline">
                            <BookOpen size={14} />
                            Tip of the day
                        </div>
                        <p className="mt-4 text-sm leading-7 text-on-surface-variant">{tipOfTheDay}</p>
                        <div className="mt-5 rounded-2xl border border-white/10 bg-background/60 px-4 py-3 text-xs text-on-surface-variant">
                            <div className="flex items-center gap-2 text-primary">
                                <FileText size={14} />
                                Upload guidance
                            </div>
                            <p className="mt-2 leading-6">Use the left sidebar drop zone for a faster upload flow and automatic chat creation.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-grow relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-12 overflow-y-auto scroll-smooth px-4 py-12 pb-32 md:px-8 custom-scrollbar">
            <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                    const isLastAi = !msg.isUser && index === messages.length - 1

                    return (
                        <motion.div
                            key={index}
                            initial={{opacity: 0, y: 20}}
                            animate={{opacity: 1, y: 0}}
                            layout
                            className={`flex w-full items-start gap-4 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            {!msg.isUser && (
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-container-highest shadow-lg">
                                    <Bot size={20} className="text-primary" />
                                </div>
                            )}

                            <div className={`max-w-[92%] md:max-w-2xl ${msg.isUser ? 'order-1' : 'order-2'}`}>
                                <div className={`rounded-3xl border shadow-xl ${msg.isUser ? 'rounded-tr-none border-primary/20 bg-primary-container px-5 py-4 text-on-primary-container' : 'rounded-tl-none border-white/10 bg-surface-container-highest px-5 py-4 text-on-surface'}`}>
                                    <AnimatedMarkdown content={msg.message} isStreaming={isLastAi && loading} />

                                    {!msg.isUser && msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-5 border-t border-white/10 pt-4">
                                            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-outline">Citations</div>
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {msg.sources.map((source, idx) => (
                                                    <button
                                                        key={`${source.source}-${source.page}-${idx}`}
                                                        onClick={() => source.page && setPdfPage(source.page)}
                                                        className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-xs font-medium text-primary transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/10"
                                                    >
                                                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary">
                                                            <BookOpen size={14} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-outline">
                                                                <span>Page {source.page ?? 'N/A'}</span>
                                                                <span className="h-1 w-1 rounded-full bg-primary/70" />
                                                                <span>Source</span>
                                                            </div>
                                                            <div className="mt-1 truncate text-sm text-white">{formatSource(source.source)}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {msg.isUser && (
                                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-container-high shadow-lg order-2">
                                    <User size={20} className="text-on-surface-variant" />
                                </div>
                            )}
                        </motion.div>
                    )
                })}
            </AnimatePresence>

            {loading && messages.length > 0 && messages[messages.length - 1].isUser && (
                <motion.div
                    initial={{opacity: 0, y: 10}}
                    animate={{opacity: 1, y: 0}}
                    className="flex w-full items-start gap-4"
                >
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-surface-container-highest shadow-lg">
                        <Bot size={20} className="text-primary" />
                    </div>
                    <div className="flex min-h-[58px] items-center gap-3 rounded-3xl rounded-tl-none border border-white/5 bg-surface-container-highest px-5 py-4 shadow-xl">
                        <div className="flex gap-2">
                            <div className="intelligence-pulse animate-pulse" />
                            <div className="intelligence-pulse animate-pulse delay-75" />
                            <div className="intelligence-pulse animate-pulse delay-150" />
                        </div>
                        <span className="text-xs uppercase tracking-[0.25em] text-outline">Generating answer</span>
                    </div>
                </motion.div>
            )}
            <div ref={bottomRef} className="h-4" />
        </div>
    )
}

export default MessageList
