import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'solid-js'

import { cn } from '#/lib/utils'
import { cva } from 'class-variance-authority'
import { splitProps } from 'solid-js'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success:
          'border-emerald-500/25 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        error:
          'border-red-500/25 bg-red-500/15 text-red-600 dark:text-red-400',
        warning:
          'border-amber-500/25 bg-amber-500/15 text-amber-600 dark:text-amber-400',
        info:
          'border-blue-500/25 bg-blue-500/15 text-blue-600 dark:text-blue-400',
        neutral:
          'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeProps = ComponentProps<'div'>
  & VariantProps<typeof badgeVariants>

const Badge = (props: BadgeProps) => {
  const [local, others] = splitProps(props, ['variant', 'class'])
  return (
    <div class={cn(badgeVariants({ variant: local.variant }), local.class)} {...others} />
  )
}

export { Badge, badgeVariants }
