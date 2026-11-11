// Copyright 2025 Takin Profit. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import { TbOutlineRss } from 'solid-icons/tb'

/**
 * News Page - Placeholder for RSS news feed reader
 *
 * This is a placeholder component for the RSS news feed feature.
 * Full RSS implementation is planned for a future release.
 */
export const NewsPage = () => {
  return (
    <div class="flex h-full flex-col items-center justify-center gap-4">
      <TbOutlineRss class="size-16 text-muted-foreground" />
      <h1 class="text-2xl font-semibold">RSS News Feed</h1>
      <p class="text-lg text-muted-foreground">Coming soon</p>
      <p class="max-w-md text-center text-sm text-muted-foreground">
        The news feed will display curated financial news and updates from your favorite RSS sources.
      </p>
    </div>
  )
}
