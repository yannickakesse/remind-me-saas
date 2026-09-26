const fs = require('fs');
const path = require('path');

// Génère un fichier WAV 44.1kHz 16-bit PCM pur du carillon cristallin Remind Me
function generateChimeWav() {
  const sampleRate = 44100;
  const duration = 1.2; // 1.2 secondes
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 2; // Stereo
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF Header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // BitsPerSample (16)
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Notes de l'arpège cristallin (E5 -> A5 -> E6)
  const notes = [
    { start: 0.00, freq: 659.25, dur: 0.45, gain: 0.75, decay: 8.0, pan: -0.2 },
    { start: 0.09, freq: 880.00, dur: 0.55, gain: 0.85, decay: 7.0, pan: 0.0 },
    { start: 0.20, freq: 1318.51, dur: 0.90, gain: 0.95, decay: 4.5, pan: 0.2 }
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sampleL = 0;
    let sampleR = 0;

    for (const note of notes) {
      if (t >= note.start && t < note.start + note.dur) {
        const localT = t - note.start;
        // Enveloppe d'attaque percussive rapide (3ms) et extinction exponentielle soyeuse
        const attack = Math.min(1, localT / 0.003);
        const env = attack * Math.exp(-note.decay * localT);
        
        // Fondamentale + harmonique de cloche cristalline (2x et 3x)
        const fundamental = Math.sin(2 * Math.PI * note.freq * localT);
        const harmonic2 = 0.35 * Math.sin(2 * Math.PI * (note.freq * 2.01) * localT) * Math.exp(-14.0 * localT);
        const harmonic3 = 0.15 * Math.sin(2 * Math.PI * (note.freq * 3.00) * localT) * Math.exp(-22.0 * localT);
        
        const signal = (fundamental + harmonic2 + harmonic3) * env * note.gain;
        
        // Stéréo panning
        const leftVol = Math.cos((note.pan + 1) * Math.PI / 4);
        const rightVol = Math.sin((note.pan + 1) * Math.PI / 4);
        
        sampleL += signal * leftVol;
        sampleR += signal * rightVol;
      }
    }

    // Soft limiter / compression
    sampleL = Math.max(-0.95, Math.min(0.95, sampleL));
    sampleR = Math.max(-0.95, Math.min(0.95, sampleR));

    const intSampleL = Math.floor(sampleL * 32767);
    const intSampleR = Math.floor(sampleR * 32767);

    const offset = 44 + i * 4;
    buffer.writeInt16LE(intSampleL, offset);
    buffer.writeInt16LE(intSampleR, offset + 2);
  }

  const outDir = path.join(__dirname, '..', 'public', 'sounds');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const wavPath = path.join(outDir, 'notification.wav');
  const mp3Path = path.join(outDir, 'notification.mp3');

  fs.writeFileSync(wavPath, buffer);
  fs.writeFileSync(mp3Path, buffer); // WAV container playable across modern audio engines
  console.log('Audio chime generated successfully at:', wavPath);
}

generateChimeWav();
