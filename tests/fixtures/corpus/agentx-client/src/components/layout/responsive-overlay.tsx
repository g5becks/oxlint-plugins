// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import type { JSX } from 'solid-js'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '#components/ui/drawer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#components/ui/sheet'
import { useIsMobile } from '#components/ui/sidebar'
import { Show } from 'solid-js'

/**
 * Props for the ResponsiveOverlay component
 */
export type ResponsiveOverlayProps = {
  /** Controls whether the overlay is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Title text displayed in the overlay header */
  title: string
  /** Optional description text displayed in the overlay header */
  description?: string
  /** Content to render inside the overlay */
  children: JSX.Element
  /** Variant for desktop: centered dialog or side sheet (default: "dialog") */
  variant?: 'dialog' | 'sheet'
}

/**
 * ResponsiveOverlay - Adaptive overlay component
 *
 * Renders as a Drawer on mobile (<768px) or Dialog/Sheet on desktop (>=768px).
 * Mobile drawer slides up from bottom with swipe-to-dismiss.
 * Desktop can be centered dialog or right-side sheet.
 *
 * @example
 * ```tsx
 * <ResponsiveOverlay
 *   open={isOpen()}
 *   onOpenChange={setIsOpen}
 *   title="Create Strategy"
 *   description="Fill out the form below"
 *   variant="sheet"
 * >
 *   <StrategyForm />
 * </ResponsiveOverlay>
 * ```
 */
export const ResponsiveOverlay = (props: ResponsiveOverlayProps) => {
  const isMobile = useIsMobile()
  const variant = () => props.variant ?? 'dialog'

  return (
    <Show
      when={isMobile()}
      fallback={(
        <Show
          when={variant() === 'sheet'}
          fallback={(
            // Desktop Dialog (centered)
            <Dialog open={props.open} onOpenChange={props.onOpenChange}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{props.title}</DialogTitle>
                  <Show when={props.description}>
                    <DialogDescription>{props.description}</DialogDescription>
                  </Show>
                </DialogHeader>
                {props.children}
              </DialogContent>
            </Dialog>
          )}
        >
          {/* Desktop Sheet (right side, 400px wide) */}
          <Sheet open={props.open} onOpenChange={props.onOpenChange}>
            <SheetContent
              position="right"
              class="w-[400px] sm:max-w-[400px]"
            >
              <SheetHeader>
                <SheetTitle>{props.title}</SheetTitle>
                <Show when={props.description}>
                  <SheetDescription>{props.description}</SheetDescription>
                </Show>
              </SheetHeader>
              {props.children}
            </SheetContent>
          </Sheet>
        </Show>
      )}
    >
      {/* Mobile Drawer (bottom, swipeable) */}
      <Drawer open={props.open} onOpenChange={props.onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{props.title}</DrawerTitle>
            <Show when={props.description}>
              <DrawerDescription>{props.description}</DrawerDescription>
            </Show>
          </DrawerHeader>
          <div class="px-4 pb-4">{props.children}</div>
          <DrawerClose />
        </DrawerContent>
      </Drawer>
    </Show>
  )
}
