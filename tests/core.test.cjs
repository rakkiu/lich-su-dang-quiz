const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../core.js');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '../questions.json'), 'utf8'));
function seeded(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
test('source completeness, IDs and chapter coverage', () => {
  assert.equal(D.questions.length, 793);
  assert.equal(new Set(D.questions.map(q => q.id)).size, 793);
  assert.equal(new Set(D.questions.map(q => q.q)).size, 793);
  const counts = Object.fromEntries(Object.keys(D.sections).map(s => [s, D.questions.filter(q => q.section === s).length]));
  assert.deepEqual(counts, { 'mo-dau':43, 'ch1-1':147, 'ch1-2':158, 'ch2-1':143, 'ch2-2':136, 'ch3-1':45, 'ch3-2':121 });
  for (const q of D.questions) {
    assert.equal(q.options.length, 4); assert.ok(q.explain.trim());
    assert.ok(q.options.every(o => typeof o === 'string' && o.trim()));
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
    assert.equal(D.chapters.filter(ch => ch.sections.includes(q.section)).length, 1);
  }
});
test('every answer survives repeated option permutations; input remains untouched', () => {
  const random = seeded(20261106), positions = new Set();
  for (const source of D.questions) {
    const before = JSON.stringify(source);
    for (let run = 0; run < 50; run++) {
      const q = C.prepareQuestion(source, true, random);
      assert.deepEqual(q.options.map(o => o.id).sort(), [0,1,2,3]);
      for (const o of q.options) { assert.equal(o.text, source.options[o.id]); assert.equal(C.isCorrect(q, o.id), o.id === source.answer); }
      positions.add(q.options.findIndex(o => o.id === source.answer));
      assert.equal(q.options.find(o => C.isCorrect(q, o.id)).text, source.options[source.answer]);
    }
    assert.equal(JSON.stringify(source), before);
  }
  assert.equal(positions.size, 4);
});
test('grading separates wrong answers and skipped questions after shuffling', () => {
  const qs = D.questions.slice(0,3).map(q => C.prepareQuestion(q));
  assert.deepEqual(C.score([{question:qs[0],selected:qs[0].answer},{question:qs[1],selected:(qs[1].answer+1)%4},{question:qs[2],selected:null}]), {correct:1,answered:2,total:3,wrong:1,skipped:1,percent:33});
  assert.equal(C.isCorrect(qs[0], null), false);
  assert.deepEqual(C.score([]), {correct:0,answered:0,total:0,wrong:0,skipped:0,percent:0});
});
test('search supports Vietnamese accents and Đ, question, options, explanations', () => {
  assert.equal(C.normalize('Đảng Cộng sản Việt Nam'), 'dang cong san viet nam');
  assert.ok(C.matches(D.questions[0], 'ho chi minh'));
  assert.ok(C.matches(D.questions[0], '3/2/1930'));
  assert.ok(C.matches(D.questions[0], '  đảng  '));
  assert.ok(!C.matches(D.questions[0], 'no-matching-question-1234'));
});
