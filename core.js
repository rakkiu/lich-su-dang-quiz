(function (root) {
  'use strict';
  function shuffle(items, random = Math.random) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function prepareQuestion(question, mix = true, random = Math.random) {
    const options = question.options.map((text, id) => ({ id, text }));
    return { ...question, options: mix ? shuffle(options, random) : options };
  }
  // The selected value is the original option ID, never its displayed A/B/C/D position.
  function isCorrect(question, selectedId) {
    return Number.isInteger(selectedId) && selectedId === question.answer;
  }
  function score(items) {
    const correct = items.filter(item => isCorrect(item.question, item.selected)).length;
    const answered = items.filter(item => Number.isInteger(item.selected)).length;
    return { correct, answered, total: items.length, wrong: answered - correct,
      skipped: items.length - answered, percent: items.length ? Math.round(correct * 100 / items.length) : 0 };
  }
  function normalize(text) {
    return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  }
  function matches(question, query) {
    return normalize([question.q, ...question.options, question.explain].join(' ')).includes(normalize(query).trim());
  }
  const api = { shuffle, prepareQuestion, isCorrect, score, normalize, matches };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudyCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
