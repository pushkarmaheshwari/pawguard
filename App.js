import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, Platform, StatusBar, useColorScheme } from 'react-native';
import Svg, { Circle, Polyline, Text as SvgText } from 'react-native-svg';
import * as Speech from 'expo-speech';

const calm = (b) => { b.mode = null; b.food = Math.round(b.ft * 0.92); b.water = Math.max(b.water, Math.round(b.wt * 0.55)); b.hist = b.hist.map(() => b.base); b.hr = b.base; };

const L = { bg: '#F3F4F6', card: '#FFFFFF', text: '#1A1C20', muted: '#5F6672', line: '#E5E7EB', hr: '#D92D3F', act: '#0F8A4F', food: '#C2680A', water: '#1D6FD8', ok: '#0F8A4F', warn: '#C2410C', warnbg: '#FFF1E8', track: '#E8EAEE', pill: '#E9EBEF' };
const D = { bg: '#0E0F12', card: '#1B1D22', text: '#F2F3F5', muted: '#A0A7B4', line: '#2A2D34', hr: '#FF6B7A', act: '#3DCC85', food: '#F0A04B', water: '#5AA2FF', ok: '#3DCC85', warn: '#FF9B6B', warnbg: '#2B1B14', track: '#2C2F36', pill: '#262930' };

const clock = (m) => new Date(Date.now() - m * 60000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const makePets = () =>
  [
    { n: 'Bruno', base: 98, lo: 85, hi: 112, ft: 160, wt: 450, at: 45, g: ['Mom', 'Dad'] },
    { n: 'Luna', base: 170, lo: 140, hi: 200, ft: 70, wt: 200, at: 60, g: ['Mom', 'Kiran'] },
    { n: 'Rex', base: 82, lo: 65, hi: 100, ft: 300, wt: 900, at: 120, g: ['Dad', 'Kiran'] },
  ].map((p) => {
    const food = Math.round(p.ft * 0.92);
    return {
      ...p, hr: p.base, mode: null, alert: false, food,
      hist: Array.from({ length: 40 }, () => p.base + Math.round((Math.random() - 0.5) * 6)),
      water: Math.round(p.wt * 0.55), act: Math.round(p.at * 0.4),
      log: [{ t: clock(25), x: 'Water bowl refilled' }, { t: clock(90), x: 'Breakfast finished, ' + food + ' g' }, { t: clock(150), x: 'Morning walk, ' + Math.round(p.at * 0.4) + ' active min' }],
    };
  });

const issues = (p) => {
  const a = p.hist.slice(-4), avg = a.reduce((x, y) => x + y, 0) / a.length, s = [];
  if (p.food / p.ft < 0.6) s.push('ate much less than usual');
  if (avg > p.hi) s.push('has a higher heart rate than normal');
  if (avg < p.lo) s.push('has a lower heart rate than normal');
  if (p.water / p.wt < 0.2) s.push('has barely had any water');
  return s;
};

function Ring({ pct, color, c }) {
  const r = 26, len = 2 * Math.PI * r, f = Math.min(pct, 1) * len;
  return (
    <Svg width={68} height={68}>
      <Circle cx={34} cy={34} r={r} stroke={c.track} strokeWidth={8} fill="none" />
      <Circle cx={34} cy={34} r={r} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round" strokeDasharray={[f, len]} rotation={-90} origin="34, 34" />
      <SvgText x={34} y={39} fontSize={15} fontWeight="bold" fill={c.text} textAnchor="middle">{Math.round(pct * 100) + '%'}</SvgText>
    </Svg>
  );
}

function Spark({ p, c }) {
  const mn = p.lo - 5, mx = p.hi + 25;
  const pts = p.hist.map((v, i) => (i * 140) / (p.hist.length - 1) + ',' + (54 - ((Math.min(Math.max(v, mn), mx) - mn) / (mx - mn)) * 52)).join(' ');
  return (
    <Svg width={140} height={56}>
      <Polyline points={pts} fill="none" stroke={c.hr} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export default function App() {
  const c = useColorScheme() === 'dark' ? D : L;
  const pets = useRef(makePets()).current;
  const [cur, setCur] = useState(0);
  const [, force] = useState(0);
  const [guardian, setGuardian] = useState('All');
  const [speakOn, setSpeakOn] = useState(false);
  const [caption, setCaption] = useState('');
  const tick = useRef(0);
  const gRef = useRef('All');
  const sRef = useRef(false);
  const timers = useRef([]);
  gRef.current = guardian;
  sRef.current = speakOn;

  useEffect(() => {
    const id = setInterval(() => {
      tick.current += 1;
      const t = tick.current;
      pets.forEach((p) => {
        p.hr = Math.round(p.base + (p.mode === 'fast' ? 40 : 0) + (Math.random() - 0.5) * 8);
        p.hist.push(p.hr);
        if (p.hist.length > 40) p.hist.shift();
        if (t % 4 === 0) p.water = Math.min(p.wt, p.water + p.wt * 0.01);
        if (t % 3 === 0) p.act = Math.min(p.at, p.act + p.at * 0.004);
        if (t % 12 === 0) p.log.unshift({ t: clock(0), x: 'Heart rate ' + p.hr + ' bpm' });
        const found = issues(p);
        if (found.length && !p.alert) {
          p.alert = true;
          p.log.unshift({ t: clock(0), x: 'Alert sent to ' + p.g.join(' and ') });
          if (sRef.current && (gRef.current === 'All' || p.g.includes(gRef.current))) Speech.speak(p.n + ' ' + found.join(' and ') + '. Alert sent to ' + p.g.join(' and ') + '.');
        } else if (!found.length && p.alert) {
          p.alert = false;
          p.log.unshift({ t: clock(0), x: 'Back to normal' });
        }
        if (p.log.length > 12) p.log.length = 12;
      });
      force((n) => n + 1);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const vis = pets.filter((x) => guardian === 'All' || x.g.includes(guardian));
  const p = vis.includes(pets[cur]) ? pets[cur] : vis[0], is = issues(p), bad = is.length > 0;

  const skip = () => { p.food = Math.round(p.ft * 0.4); p.log.unshift({ t: clock(0), x: 'Breakfast: only 40% eaten' }); force((n) => n + 1); };
  const fast = () => { p.mode = 'fast'; };
  const reset = () => { calm(p); force((n) => n + 1); };
  const low = () => { p.water = Math.round(p.wt * 0.1); p.log.unshift({ t: clock(0), x: 'Water bowl almost empty' }); force((n) => n + 1); };
  const readAloud = () => {
    Speech.stop();
    Speech.speak((bad ? p.n + ' ' + is.join(' and ') + '. Alert sent to ' + p.g.join(' and ') + '.' : p.n + ' is doing well.') + ' Heart rate ' + p.hr + ' beats per minute, normal is ' + p.lo + ' to ' + p.hi + '. Activity ' + Math.round((p.act / p.at) * 100) + ' percent, food ' + Math.round((p.food / p.ft) * 100) + ' percent, water ' + Math.round((p.water / p.wt) * 100) + ' percent.');
  };
  const stop = () => { timers.current.forEach(clearTimeout); timers.current = []; setCaption(''); Speech.stop(); };
  const story = () => {
    stop(); setGuardian('All'); setCur(0);
    const b = pets[0];
    [
      [0, 'A normal morning for Bruno', () => calm(b)],
      [5000, 'Bruno skips breakfast', () => { b.food = Math.round(b.ft * 0.4); b.log.unshift({ t: clock(0), x: 'Breakfast: only 40% eaten' }); }],
      [11000, 'His heart rate starts to climb', () => { b.mode = 'fast'; }],
      [18000, 'Mom and Dad get the alert. Luna and Rex stay quiet.', () => {}],
      [27000, 'Bruno recovers and all is normal again', () => calm(b)],
      [33000, '', () => {}],
    ].forEach(([ms, text, fn]) => timers.current.push(setTimeout(() => { fn(); setCaption(text); force((n) => n + 1); }, ms)));
  };

  const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    wrap: { padding: 16, gap: 14, paddingBottom: 40 },
    card: { backgroundColor: c.card, borderRadius: 24, padding: 18 },
    lbl: { fontSize: 15, fontWeight: '600', color: c.muted },
    muted: { fontSize: 14, color: c.muted },
    btn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: c.pill, justifyContent: 'center' },
    btnT: { fontSize: 15, fontWeight: '600', color: c.text },
  });

  const pillColor = bad ? c.warn : c.ok;
  const Mini = ({ label, pct, color, val }) => (
    <View style={[s.card, { flex: 1, alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 14 }]}>
      <Text style={s.lbl}>{label}</Text>
      <Ring pct={pct} color={color} c={c} />
      <Text style={[s.muted, { textAlign: 'center' }]}>{val}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={c === D ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={s.wrap}>
        <View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: c.text }}>PawGuard</Text>
          <Text style={{ fontSize: 15, color: c.muted }}>Live health, simulated sensor data</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={s.muted}>View as</Text>
          {['All', 'Mom', 'Dad', 'Kiran'].map((g) => (
            <Pressable key={g} accessibilityRole="button" onPress={() => setGuardian(g)}
              style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: g === guardian ? c.text : c.pill }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: g === guardian ? c.bg : c.text }}>{g}</Text>
            </Pressable>
          ))}
        </View>

        {caption ? (
          <View style={[s.card, { backgroundColor: c.text }]}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: c.bg }}>{caption}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {vis.map((x) => (
            <Pressable key={x.n} accessibilityRole="button" onPress={() => setCur(pets.indexOf(x))}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, padding: 6, borderRadius: 24, backgroundColor: x === p ? c.text : c.pill }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontWeight: '700', color: c.text }}>{x.n[0]}</Text>
              </View>
              <Text style={{ fontWeight: '600', fontSize: 15, color: x === p ? c.bg : c.text }}>{x.n}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[s.card, { gap: 8 }, bad && { backgroundColor: c.warnbg }]}>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, backgroundColor: pillColor + '29' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: pillColor }}>{bad ? 'Needs a look' : 'All normal'}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '600', color: c.text }}>{bad ? p.n + ' ' + is.join(' and ') + '.' : p.n + ' is doing well'}</Text>
          <Text style={{ fontSize: 16, lineHeight: 22, color: c.muted }}>
            {bad ? 'Worth watching today. Alert sent to ' + p.g.join(' and ') + '.' : 'Everything is within the usual range for ' + p.n + '.'}
          </Text>
          <Pressable style={[s.btn, { alignSelf: 'flex-start', marginTop: 4 }]} onPress={readAloud} accessibilityRole="button">
            <Text style={s.btnT}>Read aloud</Text>
          </Pressable>
        </View>

        <View style={s.card}>
          <Text style={s.lbl}>Heart rate</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
            <Text style={{ fontSize: 56, fontWeight: '700', color: c.hr }}>{p.hr}<Text style={{ fontSize: 18, color: c.muted }}> bpm</Text></Text>
            <Spark p={p} c={c} />
          </View>
          <Text style={[s.muted, { marginTop: 10 }]}>{'Normal for ' + p.n + ': ' + p.lo + ' to ' + p.hi + ' bpm'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Mini label="Activity" pct={p.act / p.at} color={c.act} val={Math.round(p.act) + ' of ' + p.at + ' min'} />
          <Mini label="Food" pct={p.food / p.ft} color={c.food} val={p.food + ' of ' + p.ft + ' g'} />
          <Mini label="Water" pct={p.water / p.wt} color={c.water} val={Math.round(p.water) + ' of ' + p.wt + ' ml'} />
        </View>

        <View style={s.card}>
          <Text style={[s.lbl, { marginBottom: 6 }]}>Recent readings</Text>
          {p.log.slice(0, 6).map((e, i) => (
            <View key={e.t + e.x + i} style={{ flexDirection: 'row', gap: 14, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Text style={{ width: 72, fontSize: 15, color: c.muted }}>{e.t}</Text>
              <Text style={{ flex: 1, fontSize: 16, color: c.text }}>{e.x}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <Text style={[s.lbl, { marginBottom: 10 }]}>Demo controls</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable style={s.btn} onPress={skip} accessibilityRole="button"><Text style={s.btnT}>Skip a meal</Text></Pressable>
            <Pressable style={s.btn} onPress={fast} accessibilityRole="button"><Text style={s.btnT}>Raise heart rate</Text></Pressable>
            <Pressable style={s.btn} onPress={low} accessibilityRole="button"><Text style={s.btnT}>Low water</Text></Pressable>
            <Pressable style={s.btn} onPress={reset} accessibilityRole="button"><Text style={s.btnT}>Reset</Text></Pressable>
            <Pressable style={[s.btn, speakOn && { backgroundColor: c.text }]} onPress={() => { setSpeakOn(!speakOn); Speech.stop(); }} accessibilityRole="button">
              <Text style={[s.btnT, speakOn && { color: c.bg }]}>{speakOn ? 'Speak alerts: on' : 'Speak alerts: off'}</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor: c.act }]} onPress={caption ? stop : story} accessibilityRole="button">
              <Text style={[s.btnT, { color: c === D ? '#0E0F12' : '#FFFFFF' }]}>{caption ? 'Stop demo' : 'Play demo story'}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={{ fontSize: 13, color: c.muted, marginHorizontal: 4 }}>
          All readings are generated by a sensor simulator. Real collars and smart bowls can plug in later.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}