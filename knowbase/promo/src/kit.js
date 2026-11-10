// 每一帧共用的时间线小工具。tools/build-frames.mjs 把这份原样塞进每一帧的闭包里。
//
// 约定:传进来的秒数一律是「全片时间」(STORYBOARD.md / audiomap.json 里那一份),
// 换算成这一帧自己的时间只在 at() 一处做 —— 改拍点时照着分镜抄数字就行。
//
// 不依赖 onUpdate / 定时器 / 随机数:渲染是逐帧 seek 出来的,任何「播放时才发生」的东西
// 都落不到画面上。计数用数字带、打字用逐字点亮,都是纯时间线。
function kbKit(root, tl, T0, DUR) {
  function $(s) { return root.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
  function at(t) { return Math.max(0, Math.round((t - T0) * 1000) / 1000); }

  // 一组的可见区间。开头那组靠 .kb-first 本来就亮着,a 传 null;末尾那组 b 传 null
  function gate(el, a, b) {
    if (a != null && at(a) > 0) tl.set(el, { autoAlpha: 1 }, at(a));
    if (b != null && at(b) < DUR) tl.set(el, { autoAlpha: 0 }, at(b));
  }

  // 砸进来:从 from 那个偏移快速落到原位
  function slam(el, t, from, dur, stagger) {
    var f = { opacity: 0 }, to = { opacity: 1, duration: dur || 0.22, ease: 'expo.out' };
    for (var key in from) { f[key] = from[key]; to[key] = key.indexOf('scale') === 0 ? 1 : 0; }
    if (stagger) to.stagger = stagger;
    tl.fromTo(el, f, to, at(t));
  }

  // 遮罩里的字顶上来(els 的父级要 overflow:hidden)
  function rise(els, t, stagger, dur) {
    tl.fromTo(els, { yPercent: 115 },
      { yPercent: 0, duration: dur || 0.3, ease: 'expo.out', stagger: stagger || 0 }, at(t));
  }

  // 匀速的慢推,撑满一段时长
  function push(el, t0, t1, s0, s1, extra) {
    var to = { scale: s1, duration: t1 - t0, ease: 'none' };
    for (var key in extra || {}) to[key] = extra[key];
    tl.fromTo(el, { scale: s0 }, to, at(t0));
  }

  // 把一段字拆成逐字的 span
  function chars(el) {
    var text = el.textContent;
    el.textContent = '';
    return Array.from(text).map(function (c) {
      var s = document.createElement('span');
      s.className = 'kb-ch';
      s.textContent = c;
      el.appendChild(s);
      return s;
    });
  }

  // 打字:t0 到 t1 之间逐字出现,光标是紧跟在后面的兄弟元素,自己就会跟着走
  function typeOn(el, t0, t1) {
    var cs = chars(el);
    cs.forEach(function (c, i) {
      c.style.display = 'none';
      tl.set(c, { display: 'inline-block' }, at(t0 + (t1 - t0) * i / Math.max(1, cs.length - 1)));
    });
    return cs;
  }

  // 滚轮式计数。el 的文字就是目标值(可以带千分位逗号);tLand 是最后一位停稳的那一刻,
  // 前面几位依次早停一点,读起来是从左到右锁定
  function roll(el, t0, tLand) {
    var text = el.textContent.trim();
    var glyphs = Array.from(text);
    var strips = [];
    el.textContent = '';
    el.classList.add('kb-odo');
    glyphs.forEach(function (c, i) {
      if (!/\d/.test(c)) {
        var sep = document.createElement('span');
        sep.className = 'kb-odo-c';
        sep.textContent = c;
        el.appendChild(sep);
        return;
      }
      var cell = document.createElement('span');
      var strip = document.createElement('span');
      var turns = 12 + i * 3;
      cell.className = 'kb-odo-d';
      strip.className = 'kb-odo-s';
      for (var n = turns - 1; n >= 0; n--) {
        var d = document.createElement('i');
        d.textContent = String((((+c - n) % 10) + 10) % 10);
        // 路过的那些数字没人要读,只有停下来的那一格算正文
        if (n) d.setAttribute('data-layout-ignore', '');
        strip.appendChild(d);
      }
      cell.appendChild(strip);
      el.appendChild(cell);
      strips.push({ el: strip, turns: turns });
    });
    strips.forEach(function (s, i) {
      var land = tLand - (strips.length - 1 - i) * 0.07;
      tl.fromTo(s.el, { yPercent: 0 },
        { yPercent: -100 * (s.turns - 1) / s.turns, duration: Math.max(0.2, land - t0), ease: 'power3.out' },
        at(t0));
    });
  }

  return { $: $, $$: $$, at: at, gate: gate, slam: slam, rise: rise, push: push,
           chars: chars, typeOn: typeOn, roll: roll };
}
