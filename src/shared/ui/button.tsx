import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type * as React from 'react'

import { cn } from '@/shared/lib/utils'

// Figma: orange fill with dark mono text, or orange outline, always with the 6 px button
// radius; tall CTAs on mobile ("Comprar NFT", "Conectar e finalizar")
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-button border border-transparent font-bold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-accent-foreground',
        outline: 'border-primary bg-transparent text-accent-foreground hover:bg-primary/10',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-border-soft',
        ghost: 'text-foreground hover:bg-card',
        destructive: 'bg-destructive/15 text-destructive hover:bg-destructive/25',
        link: 'h-auto px-0 text-accent-foreground underline-offset-4 hover:underline',
        // Mobile end-of-page actions (Figma): primary at 100% fading to 80% from left to right
        cta: 'bg-linear-to-r from-primary to-primary/80 text-primary-foreground hover:from-accent-foreground hover:to-accent-foreground/80',
      },
      size: {
        default: 'h-10 px-4 text-body',
        sm: 'h-8 px-3 text-caption',
        lg: 'h-12 px-6 text-body-lg',
        // Mobile primary actions from the Figma (60 px tall)
        xl: 'h-15 px-6 text-body-lg',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      // Never submit a form by accident; submit buttons opt in explicitly
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
