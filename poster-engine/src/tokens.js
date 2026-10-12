// Brand tokens from the Postr News brand book. Change values there first, then here.
module.exports = {
  color: {
    ink: '#0A0A0B',
    paper: '#F4F1EA',
    lime: '#D4FF3A',
    signal: '#FF5A1F',
    blue: '#2B4BFF',
    pink: '#FFB8E0',
    chat: '#1D3B2C',
    onChat: '#DFF5E6',
    myth: '#141416',
    angleC: '#8FA2FF',
    mutedOnInk: '#C9C6BD',
  },
  canvas: {
    width: 1080,
    feedHeight: 1350, // 4:5
    storyHeight: 1920, // 9:16
    margin: 72, // space-8
    storySafeTop: 250,
    storySafeBottom: 340,
  },
  fonts: {
    display: "'Unbounded', 'Mukta', sans-serif",
    text: "'Manrope', 'Mukta', sans-serif",
    deva: "'Mukta', 'Manrope', sans-serif",
    // Loaded from Google Fonts when the server has internet; drop .woff2 files in /fonts to work offline.
    googleCss:
      'https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=Manrope:wght@600;700;800&family=Mukta:wght@500;700;800&display=swap',
  },
  // Ground and text colour per format: fixed by the brand book, never swapped.
  formats: {
    impact: { ground: 'lime', text: 'ink', tag: '₹ IMPACT', wordmark: 'ink' },
    alert: { ground: 'signal', text: 'ink', tag: 'ALERT', wordmark: 'ink' },
    number: { ground: 'blue', text: 'paper', tag: 'NUMBER OF THE DAY', wordmark: 'paper' },
    tracker: { ground: 'paper', text: 'ink', tag: 'THEN VS NOW', wordmark: 'paper' },
    myth: { ground: 'myth', text: 'paper', tag: 'MYTH VS FACT', wordmark: 'paper' },
    angles: { ground: 'pink', text: 'ink', tag: '3 ANGLES', wordmark: 'ink' },
  },
};
