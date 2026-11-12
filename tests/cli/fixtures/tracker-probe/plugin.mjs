// Probe for the shared errorset tracker test (TASK-032): reports the errorset tracker stats that
// oxlint-plugin-errorset publishes on globalThis when OXLINT_PLUGIN_ERRORSET_STATS=1.
const KEY = Symbol.for("oxlint-plugin-errorset/tracker-stats");
export default {
  meta: { name: "tracker-probe" },
  rules: {
    stats: {
      meta: { schema: [], messages: { stats: "{{stats}}" } },
      createOnce(context) {
        return {
          "Program:exit"(node) {
            context.report({ node, messageId: "stats", data: { stats: JSON.stringify(globalThis[KEY] ?? null) } });
          },
        };
      },
    },
  },
};
