import postgres from "postgres";
const sql = postgres({ types: { real: { to: 700, from: [700], parse: parseFloat, serialize: x => x.toString() } } });
console.log(sql.options.types);
