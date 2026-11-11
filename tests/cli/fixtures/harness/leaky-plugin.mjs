// Deliberately broken plugin for the state-isolation harness self-test:
// `seen` lives in the createOnce closure and is never reset, so every file
// after one containing `LEAK` is reported too (the audit R9 bug pattern).
export default {
  meta: { name: "harness" },
  rules: {
    leaky: {
      meta: { type: "problem", messages: { leak: "saw LEAK in this or an earlier file" } },
      createOnce(context) {
        let seen = false;
        return {
          Identifier(node) {
            if (node.name === "LEAK") seen = true;
          },
          "Program:exit"(node) {
            if (seen) context.report({ node, messageId: "leak" });
          },
        };
      },
    },
  },
};
