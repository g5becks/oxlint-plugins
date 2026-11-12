export default function PnlPage() {
  return (
    <div class="p-4 sm:p-6 space-y-6">
      <div class="space-y-2">
        <h2 class="text-2xl font-semibold">P&L Dashboard</h2>
        <p class="text-sm text-muted-foreground">
          Profit and loss metrics and analytics
        </p>
      </div>

      {/* Hero Numbers Placeholder */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="rounded-lg border border-border bg-card p-6 space-y-2">
          <p class="text-sm text-muted-foreground">Total P&L</p>
          <p class="text-mono-lg text-2xl font-semibold">$0.00</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-6 space-y-2">
          <p class="text-sm text-muted-foreground">Today's P&L</p>
          <p class="text-mono-lg text-2xl font-semibold">$0.00</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-6 space-y-2">
          <p class="text-sm text-muted-foreground">Win Rate</p>
          <p class="text-mono-lg text-2xl font-semibold">0%</p>
        </div>
        <div class="rounded-lg border border-border bg-card p-6 space-y-2">
          <p class="text-sm text-muted-foreground">Total Trades</p>
          <p class="text-mono-lg text-2xl font-semibold">0</p>
        </div>
      </div>

      <div class="rounded-lg border border-border bg-card p-6">
        <p class="text-sm text-muted-foreground">
          P&L charts and detailed analytics will be implemented here
        </p>
      </div>
    </div>
  )
}
