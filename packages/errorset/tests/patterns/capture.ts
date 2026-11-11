// errorset 0.4 top-level captureSync / captureAsync: throwing in the captured function is fine.
import { captureAsync, captureSync, errorSet } from "@takinprofit/errorset";

type Io = { path: string };

export const IoError = errorSet("IoError", ["read_failed"]).init<Io>();

export function read(path: string): string | typeof IoError.Type {
  return captureSync(
    () => {
      if (!path) throw new Error("no path");
      return path;
    },
    (e) => IoError.read_failed`Read failed`.with({ cause: e }),
  );
}

export async function readAsync(path: string): Promise<string | typeof IoError.Type> {
  return captureAsync(
    async () => {
      if (!path) throw new Error("no path");
      return path;
    },
    (e) => IoError.read_failed`Read failed`.with({ cause: e }),
  );
}
