// errorset 0.4: no-context errors are plain objects; `.with({ cause })` adds a cause.
import { errorSet } from "@takinprofit/errorset";

type Job = { id: string };

export const JobError = errorSet("JobError", ["timeout", "failed"]).init<Job>();

export function run(cause: unknown): Job | typeof JobError.Type {
  if (cause) throw JobError.failed`Job failed`.with({ cause }); // report: no-throw-errorset
  return JobError.timeout`Job timed out`.with({ cause: new Error("slow") });
}

export function runChecked(job: Job): Job | typeof JobError.Type {
  if (!job.id) throw new TypeError("no id"); // report: no-new-error-in-errorset-fn
  return JobError.failed`Job failed`.with({ cause: job });
}

export function all(ids: string[]): Array<string | typeof JobError.Type> {
  // A throw inside a callback: reported, but never rewritten (no suggestion there).
  return ids.map((id) => {
    if (!id) throw JobError.failed`empty id`.with({ cause: id }); // report: no-throw-errorset
    return id;
  });
}
