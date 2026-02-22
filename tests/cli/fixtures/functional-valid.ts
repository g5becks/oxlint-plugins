// All const — no let
const x = 1;
const y = "hello";
const arr = [1, 2, 3];

// No throw statements
function safeDivide(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

// No Promise.reject
async function fetchData(): Promise<string> {
  return "data";
}

// Property signatures (not method signatures)
interface UserService {
  getUser: (id: string) => Promise<string>;
  deleteUser: (id: string) => Promise<void>;
}
