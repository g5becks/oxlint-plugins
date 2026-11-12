// Probe plugin for the before()-skip test (TASK-031): `skip/always` reports every Program, but
// its before() returns false for files whose name contains "skipped".
export default {
  meta: { name: "skip" },
  rules: {
    always: {
      meta: { schema: [], messages: { seen: "visited" } },
      createOnce(context) {
        return {
          before() {
            return !context.filename.includes("skipped");
          },
          Program(node) {
            context.report({ node, messageId: "seen" });
          },
        };
      },
    },
  },
};
