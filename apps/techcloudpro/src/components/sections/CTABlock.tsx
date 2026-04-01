import { Button } from '../ui/Button'

interface CTABlockProps {
  title?: string
  subtitle?: string
  buttonText?: string
  buttonHref?: string
}

export function CTABlock({
  title = "Let's Build What's Next \u2014 Together",
  subtitle = '40 hours of free discovery. Your technology roadmap, built by practitioners who ship.',
  buttonText = 'Schedule Free Consultation',
  buttonHref = '/contact',
}: CTABlockProps) {
  return (
    <section className="mx-6 md:mx-12 my-20 px-8 md:px-16 py-16 md:py-20 rounded-3xl text-center relative overflow-hidden bg-gradient-to-br from-blue-600/8 via-purple-500/6 to-cyan-500/4 border border-[var(--glass-border)] backdrop-blur-xl">
      {/* Decorative orbs */}
      <div className="absolute -top-24 -right-12 w-72 h-72 rounded-full bg-blue-600 opacity-10 blur-[80px]" />
      <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-purple-500 opacity-8 blur-[80px]" />

      <h2 className="text-3xl md:text-[42px] font-extrabold tracking-tight mb-3 relative">{title}</h2>
      <p className="text-[var(--text-dim)] text-base md:text-lg mb-8 relative">{subtitle}</p>
      <Button href={buttonHref} size="lg" className="relative">
        {buttonText}
      </Button>
    </section>
  )
}
