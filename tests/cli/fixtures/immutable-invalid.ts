// let — should use const
let x = 1;
let y = "hello";

// throw statement
function validate(input: string): void {
  if (!input) {
    throw new Error("Input is required");
  }
}

// Promise.reject
function fetchData(): Promise<string> {
  return Promise.reject(new Error("not implemented"));
}
