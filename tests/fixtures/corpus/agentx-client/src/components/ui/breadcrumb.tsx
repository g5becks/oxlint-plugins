import type { Component, JSX } from 'solid-js'
import { cn } from '#/lib/utils'

import { TbOutlineChevronRight } from 'solid-icons/tb'
import { splitProps } from 'solid-js'

type BreadcrumbProps = {
  class?: string
  children: JSX.Element
}

type BreadcrumbItemProps = {
  class?: string
  children: JSX.Element
}

type BreadcrumbSeparatorProps = {
  class?: string
  children?: JSX.Element
}

type BreadcrumbLinkProps = {
  class?: string
  href?: string
  children: JSX.Element
}

type BreadcrumbPageProps = {
  class?: string
  children: JSX.Element
}

const Breadcrumb: Component<BreadcrumbProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  return (
    <nav aria-label="breadcrumb" class={cn('flex items-center gap-2', local.class)} {...others}>
      {local.children}
    </nav>
  )
}

const BreadcrumbList: Component<BreadcrumbProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  return (
    <ol class={cn('flex items-center gap-1.5', local.class)} {...others}>
      {local.children}
    </ol>
  )
}

const BreadcrumbItem: Component<BreadcrumbItemProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  return (
    <li class={cn('inline-flex items-center gap-1.5', local.class)} {...others}>
      {local.children}
    </li>
  )
}

const BreadcrumbSeparator: Component<BreadcrumbSeparatorProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  return (
    <li
      role="presentation"
      aria-hidden="true"
      class={cn('text-muted-foreground', local.class)}
      {...others}
    >
      {local.children ?? <TbOutlineChevronRight class="size-3.5" />}
    </li>
  )
}

const BreadcrumbLink: Component<BreadcrumbLinkProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'href', 'children'])
  return (
    <a
      href={local.href}
      class={cn('text-sm text-muted-foreground transition-colors hover:text-foreground', local.class)}
      {...others}
    >
      {local.children}
    </a>
  )
}

const BreadcrumbPage: Component<BreadcrumbPageProps> = (props) => {
  const [local, others] = splitProps(props, ['class', 'children'])
  return (
    <span
      aria-current="page"
      class={cn('text-sm font-medium text-foreground', local.class)}
      {...others}
    >
      {local.children}
    </span>
  )
}

export {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
}
