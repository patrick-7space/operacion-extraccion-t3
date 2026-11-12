// =============================================================================
//  NIVEL: HOSPITAL "SAN LÁZARO" — datos puros (sin Three.js) para poder validarlos con Node.
// =============================================================================
export const CELL = 5, GW = 32, GH = 20;

export const grid = Array.from({ length: GH }, () => Array(GW).fill(0));
const H = (r, c0, c1) => { for (let c = c0; c <= c1; c++) grid[r][c] = 1; };
const V = (c, r0, r1) => { for (let r = r0; r <= r1; r++) grid[r][c] = 1; };
const door = (r, c0, c1) => { for (let c = c0; c <= c1; c++) grid[r][c] = 0; };

H(0, 0, GW - 1); H(GH - 1, 0, GW - 1); V(0, 0, GH - 1); V(GW - 1, 0, GH - 1);

H(4, 1, 26); door(4, 4, 5); door(4, 13, 14); door(4, 22, 23);
V(9, 1, 3); V(18, 1, 3); V(27, 1, 3);

H(7, 1, 28); door(7, 4, 5); door(7, 13, 14); door(7, 22, 23);
V(9, 8, 10); V(18, 8, 10);
V(28, 7, 11);
H(11, 1, 28);

H(14, 3, 30);

for (let r = 15; r <= 17; r++) H(r, 6, 9);
for (let r = 16; r <= 18; r++) H(r, 12, 15);
for (let r = 15; r <= 17; r++) H(r, 18, 21);
for (let r = 16; r <= 18; r++) H(r, 24, 26);

[[8, 5], [16, 6], [24, 5], [24, 12], [18, 13], [12, 12], [6, 13]].forEach(([c, r]) => { grid[r][c] = 1; });

export const SPAWN = { c: 2, r: 2, yaw: Math.PI };
export const EXTRACT = { c0: 28, c1: 30, r0: 16, r1: 18 };

export const ZOMBIE_SPAWNS = [
  [12, 2], [15, 3], [21, 2, 'r'], [25, 3], [29, 2],
  [11, 5], [18, 6], [26, 5, 'r'],
  [3, 9], [7, 10], [12, 9], [16, 8], [21, 9], [25, 10, 'r'],
  [29, 8], [30, 11],
  [26, 12], [20, 13, 'r'], [14, 12], [8, 13], [4, 12],
  [1, 16],
  [4, 17], [10, 16], [17, 18], [22, 16, 'r'], [26, 15],
  [28, 3], [15, 5], [22, 6], [23, 8, 'r'], [14, 10],
  [29, 10], [17, 12], [11, 13, 'r'],
  [8, 18], [14, 15], [20, 18], [27, 17, 'r'],
];

export const AMMO_SPAWNS = [
  [7, 1], [11, 3], [25, 1], [2, 10], [17, 10], [26, 9], [8, 12], [5, 18], [22, 15],
  [15, 6], [27, 13], [11, 17]
];

export const BOOST_SPAWNS = [[29, 6], [19, 12], [2, 15]];

export const ROOM_LABELS = [
  ['RECEPCIÓN', 4.5, 2, '#9ad0ff'], ['FARMACIA', 13.5, 2, '#ffd27a'], ['QUIRÓFANO', 22.5, 2, '#ff8a8a'], ['ALMACÉN', 29, 2, '#cfcfcf'],
  ['PASILLO URGENCIAS', 14, 6, '#ffffff'],
  ['SALA 1', 4.5, 9, '#ffd27a'], ['SALA 2', 13.5, 9, '#ffd27a'], ['SALA 3', 23.5, 9, '#ffd27a'],
  ['PASILLO B', 14, 13, '#ffffff'], ['LABORATORIO', 14, 16.5, '#7affb2'],
];

export const PROPS = [];
const P = (kind, x, z, sx, sz) => PROPS.push({ kind, x, z, sx, sz });

P('desk', 32, 11, 6, 1.2); P('bench', 12, 6.5, 5, 0.8); P('bench', 40, 6.5, 4, 0.8);

P('cabinet', 60, 6.2, 6, 0.7); P('cabinet', 80, 6.2, 6, 0.7); P('table', 70, 14, 3, 1.2);

P('optable', 115, 12.5, 1.0, 2.4); P('cabinet', 100, 6.2, 4, 0.7); P('cabinet', 130, 6.2, 4, 0.7);

P('crate', 148, 8, 1.4, 1.4); P('crate', 152, 15, 1.6, 1.6);

P('gurney', 50, 28, 0.9, 2.0); P('gurney', 100, 32, 0.9, 2.0); P('cart', 140, 28, 1.6, 0.8);

P('bed', 10, 43, 1.0, 2.0); P('bed', 34, 43, 1.0, 2.0); P('bed', 41, 43, 1.0, 2.0); P('cabinet', 25, 54, 3, 0.8);

P('bed', 55, 43, 1.0, 2.0); P('bed', 85, 43, 1.0, 2.0); P('table', 70, 52, 3, 1.0);

P('bed', 100, 43, 1.0, 2.0); P('bed', 132, 43, 1.0, 2.0); P('bed', 100, 53, 1.0, 2.0);

P('crate', 150, 50, 1.5, 1.5);

P('cart', 82, 62, 1.8, 0.9); P('gurney', 105, 67, 2.0, 0.9);

P('crate', 55, 92, 1.5, 1.5); P('crate', 85, 77, 1.5, 1.5); P('crate', 136, 92, 2, 2);