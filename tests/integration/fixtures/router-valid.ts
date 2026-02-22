import { createFileRoute } from "@tanstack/react-router";

createFileRoute("/users/$userId")({
  component: Users,
});
