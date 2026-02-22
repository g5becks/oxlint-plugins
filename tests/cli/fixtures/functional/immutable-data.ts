// ── VALID ──────────────────────────────────────────────
const validArr = [1, 2, 3];
const newArr = [...validArr, 4];
const validObj = { name: "John" };
const newObj = { ...validObj, age: 30 };

// ── INVALID ────────────────────────────────────────────

// 1) property assignment
const person = { name: "John" };
person.name = "Jane";

// 2) array mutation via push
const items = [1, 2, 3];
items.push(4);

// 3) array index assignment
const nums = [10, 20, 30];
nums[0] = 99;

// 4) delete operator
const config = { debug: true, verbose: false };
delete config.verbose;
