/*
 * IS355 topic tools, shared by the registration form, the public topic list
 * and the admin dashboard:
 *   - similarity(): how close two topics are (TF-IDF cosine over title +
 *     both descriptions, unigrams), plus "same dataset" detection
 *   - quality(): pre-review checklist; failed checks map to the dashboard's
 *     preset review items so the reviewer starts with them ticked
 *   - refBadge(): label for a reference's verification status
 */
(function (root) {
  var STOP = ('a an and are as at be by for from in into is it of on or that the this to with using based via ' +
    'va cua cho cac tren voi bang trong de mot nhung duoc la co tu theo khi nay do nham ve hay nhu sau cung ' +
    'he thong de tai nghien cuu xay dung ung dung su dung giai phap mo hinh').split(' ');
  var STOPSET = {};
  STOP.forEach(function (w) { STOPSET[w] = true; });

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function terms(text) {
    var words = norm(text).split(' ').filter(function (w) { return w.length > 1 && !STOPSET[w]; });
    // Unigrams only: bigrams dilute the score when one group writes a
    // shorter description (measured on the class's real topics).
    return words;
  }

  function topicText(g) {
    // Title counts twice: it is the most deliberate summary of the topic.
    return [g.title, g.title, g.description, g.descriptionEn].join(' ');
  }

  function vectorize(docs) {
    var df = {};
    var tfs = docs.map(function (d) {
      var tf = {};
      terms(d).forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
      return tf;
    });
    var n = docs.length;
    return tfs.map(function (tf) {
      var v = {}, len = 0;
      Object.keys(tf).forEach(function (t) {
        var w = (1 + Math.log(tf[t])) * Math.log(1 + n / df[t]);
        v[t] = w;
        len += w * w;
      });
      len = Math.sqrt(len) || 1;
      Object.keys(v).forEach(function (t) { v[t] /= len; });
      return v;
    });
  }

  function cosine(a, b) {
    var s = 0;
    Object.keys(a).forEach(function (t) { if (b[t]) s += a[t] * b[t]; });
    return s;
  }

  function datasetKeys(g) {
    return (g.refs || []).filter(function (r) { return r.type === 'Dataset'; }).map(function (r) {
      var m = r.meta || {};
      var u = String(m.url || r.citation || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');
      return u.indexOf('/') !== -1 ? u : norm(m.title || r.citation);
    }).filter(Boolean);
  }

  /**
   * Groups most similar to `target`, best first. `others` is the list to
   * compare against (target itself is skipped by groupCode/name).
   * Each hit: { group, score (0..1), sameDataset }.
   */
  function similar(target, others, minScore) {
    var pool = others.filter(function (g) {
      return !(target.groupCode && g.groupCode === target.groupCode) &&
        !(target.groupName && norm(g.groupName) === norm(target.groupName));
    });
    if (!pool.length) return [];
    // The whole class is the corpus, so words every group uses
    // ("blockchain", "smart contract") weigh little.
    var vecs = vectorize([topicText(target)].concat(pool.map(topicText)));
    var mine = datasetKeys(target);
    return pool.map(function (g, i) {
      var theirs = datasetKeys(g);
      var same = mine.some(function (k) { return theirs.indexOf(k) !== -1; });
      return { group: g, score: cosine(vecs[0], vecs[i + 1]), sameDataset: same };
    }).filter(function (h) { return h.score >= (minScore || 0.25) || (h.sameDataset && h.score >= 0.12); })
      .sort(function (a, b) { return b.score - a.score; });
  }

  function simLevel(score) {
    return score >= 0.4 ? 'high' : score >= 0.25 ? 'medium' : 'low';
  }

  /* ---------- Quality checklist ---------- */

  function has(text, words) {
    return words.some(function (w) { return text.indexOf(w) !== -1; });
  }

  function sentences(s) {
    return String(s || '').split(/[.!?;]+\s/).filter(function (x) { return x.trim().length > 15; }).length;
  }

  var K = {
    role: ['minh bach', 'transparen', 'bat bien', 'immutab', 'truy vet', 'truy xuat', 'audit', 'kiem toan', 'trustless', 'phi tap trung', 'decentrali',
      'tamper', 'chong gia mao', 'gia mao', 'xac minh', 'verif', 'chong chinh sua', 'toan ven', 'integrity', 'provenance', 'nguon goc', 'tokeni', 'token hoa', 'on chain', 'onchain'],
    dataset: ['dataset', 'bo du lieu', 'du lieu', 'kaggle', 'elliptic', 'data'],
    model: ['xgboost', 'random forest', 'lightgbm', 'lstm', 'gnn', 'gat', 'gcn', 'svm', 'logistic', 'regression', 'neural', 'transformer',
      'isolation forest', 'autoencoder', 'machine learning', 'hoc may', 'deep learning', 'mo hinh', 'model', 'classifier', 'phan loai', 'du bao', 'predict'],
    ai: ['ai', 'ml', 'machine learning', 'hoc may', 'mo hinh', 'model', 'score', 'diem', 'du bao', 'predict', 'xgboost', 'lightgbm', 'gnn', 'gat'],
    bridge: ['oracle', 'chu ky', 'signature', 'eip 712', 'eip712', 'ecdsa', 'hash', 'chainlink', 'attestation', 'signer', 'ky so', 'chung thuc', 'bang chung'],
    contract: ['smart contract', 'hop dong thong minh', 'solidity', 'vyper', 'contract'],
    network: ['testnet', 'sepolia', 'holesky', 'ganache', 'hardhat', 'anvil', 'foundry', 'local chain', 'mang thu nghiem', 'ethereum'],
    metrics: ['precision', 'recall', 'f1', 'auc', 'accuracy', 'rmse', 'mae', 'gas', 'latency', 'do tre', 'metric', 'chi so', 'throughput', 'thoi gian giao dich', 'danh gia'],
    ui: ['dapp', 'dashboard', 'streamlit', 'react', 'giao dien', 'web3', 'ethers', 'frontend', 'ui', 'web app', 'ung dung web']
  };

  // Indexes match PRESET_ITEMS in admin/index.html.
  var CHECKS = [
    { id: 'role', preset: 0, vi: 'Nêu vai trò của Blockchain (minh bạch, chống chỉnh sửa, truy vết...)', en: 'States why Blockchain is needed (transparency, tamper-proofing, traceability...)' },
    { id: 'dataset', preset: 1, vi: 'Có dataset rõ ràng (trong mô tả hoặc tài liệu loại Dataset)', en: 'Names a dataset (in the description or a Dataset reference)' },
    { id: 'model', preset: 9, vi: 'Nêu mô hình AI/ML (bắt buộc với Mức 3-4)', en: 'Names the AI/ML model (required for Level 3-4)' },
    { id: 'bridge', preset: 2, vi: 'Nêu cách đưa kết quả AI/off-chain lên on-chain (oracle, chữ ký, hash...)', en: 'Explains how AI/off-chain results reach the chain (oracle, signature, hash...)' },
    { id: 'contract', preset: 3, vi: 'Nêu smart contract (Solidity/Vyper)', en: 'Mentions the smart contract (Solidity/Vyper)' },
    { id: 'network', preset: 3, vi: 'Nêu mạng triển khai (Sepolia testnet, Hardhat...)', en: 'Names the network (Sepolia testnet, Hardhat...)' },
    { id: 'metrics', preset: 5, vi: 'Có chỉ số đánh giá (F1, ROC-AUC, gas, độ trễ...)', en: 'Has evaluation metrics (F1, ROC-AUC, gas, latency...)' },
    { id: 'ui', preset: -1, vi: 'Có giao diện DApp/Dashboard', en: 'Has a DApp/Dashboard interface' },
    { id: 'descVi', preset: -1, vi: 'Mô tả tiếng Việt đủ ý (3-5 câu)', en: 'Vietnamese description is complete (3-5 sentences)' },
    { id: 'descEn', preset: 10, vi: 'Mô tả tiếng Anh đủ ý (3-5 câu)', en: 'English description is complete (3-5 sentences)' },
    { id: 'title', preset: 8, vi: 'Tên đề tài ngắn gọn (không quá 22 từ)', en: 'Title is concise (22 words max)' },
    { id: 'refsVerified', preset: 7, vi: 'Tài liệu tham khảo xác minh được (DOI/arXiv/link), không có tài liệu nghi bịa', en: 'References are verifiable (DOI/arXiv/link), none look fabricated' },
    { id: 'refsRecent', preset: 7, vi: 'Có tài liệu gần đây (5 năm trở lại)', en: 'Has a recent reference (last 5 years)' }
  ];

  /**
   * data: { title, description, descriptionEn, track, level, refs: [{type, citation, meta}] }
   * -> { checks: [{id, ok, applies, label, preset}], passed, total, failedPresets }
   */
  function quality(data, lang) {
    var en = lang === 'en';
    var text = norm([data.title, data.description, data.descriptionEn].join(' '));
    var refs = (data.refs || []).filter(function (r) { return r.citation; });
    var level = Number(data.level) || 0;
    var usesAi = has(text, K.ai) || level >= 3;
    var verified = refs.filter(function (r) { return r.meta && (r.meta.status === 'doi' || r.meta.status === 'arxiv'); }).length;
    var suspicious = refs.filter(function (r) { return r.meta && (r.meta.status === 'unverified' || r.meta.mismatch); }).length;
    var thisYear = new Date().getFullYear();
    var recent = refs.some(function (r) { return r.meta && Number(r.meta.year) >= thisYear - 5; });
    var anyMeta = refs.some(function (r) { return r.meta; });

    var result = {
      role: has(text, K.role),
      dataset: has(text, K.dataset) || refs.some(function (r) { return r.type === 'Dataset'; }),
      model: has(text, K.model),
      bridge: has(text, K.bridge),
      contract: has(text, K.contract),
      network: has(text, K.network),
      metrics: has(text, K.metrics),
      ui: has(text, K.ui),
      descVi: String(data.description || '').trim().length >= 150 && sentences(data.description) >= 2,
      descEn: String(data.descriptionEn || '').trim().length >= 150 && sentences(data.descriptionEn) >= 2,
      title: norm(data.title).split(' ').filter(Boolean).length <= 22,
      refsVerified: verified >= 2 && !suspicious,
      refsRecent: recent
    };
    var applies = {
      model: level >= 3 || data.track === 'E' || data.track === 'C',
      bridge: usesAi && result.contract,
      refsVerified: anyMeta,
      refsRecent: anyMeta
    };
    var checks = CHECKS.map(function (c) {
      return { id: c.id, ok: !!result[c.id], applies: applies[c.id] !== false, label: en ? c.en : c.vi, preset: c.preset };
    }).filter(function (c) { return c.applies; });
    var failed = checks.filter(function (c) { return !c.ok; });
    var presets = [];
    failed.forEach(function (c) { if (c.preset >= 0 && presets.indexOf(c.preset) === -1) presets.push(c.preset); });
    return { checks: checks, passed: checks.length - failed.length, total: checks.length, failedPresets: presets };
  }

  /* ---------- Reference badges ---------- */

  var REF_STATUS = {
    doi: { cls: 'ok', vi: 'Đã xác minh (Crossref)', en: 'Verified (Crossref)' },
    arxiv: { cls: 'ok', vi: 'Đã xác minh (arXiv)', en: 'Verified (arXiv)' },
    web: { cls: 'info', vi: 'Nguồn web', en: 'Web source' },
    suggested: { cls: 'warn', vi: 'Chưa xác minh, có gợi ý', en: 'Unverified, suggestion found' },
    unverified: { cls: 'bad', vi: 'Không xác minh được', en: 'Could not verify' }
  };

  function refBadge(meta, lang) {
    if (!meta) return { cls: 'muted', label: lang === 'en' ? 'Not checked' : 'Chưa kiểm tra' };
    if (meta.mismatch) return { cls: 'bad', label: lang === 'en' ? 'Title does not match DOI' : 'Tên bài không khớp DOI' };
    var s = REF_STATUS[meta.status] || REF_STATUS.unverified;
    var label = lang === 'en' ? s.en : s.vi;
    var thisYear = new Date().getFullYear();
    if (meta.year && Number(meta.year) < thisYear - 7) label += lang === 'en' ? ' · older paper (' + meta.year + ')' : ' · tài liệu cũ (' + meta.year + ')';
    return { cls: s.cls, label: label };
  }

  root.IS355Tools = { similar: similar, simLevel: simLevel, quality: quality, refBadge: refBadge, norm: norm };
})(window);
