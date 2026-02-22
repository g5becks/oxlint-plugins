import { createFileRoute } from "@tanstack/react-router";

createFileRoute("/users/$123bad")({
  component: Users,
});
