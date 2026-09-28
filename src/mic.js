// Mikrofonos "fújás" felismerés: a fújás erős, széles sávú zaj → magas RMS szint.

export async function startMic() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  });
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  ac.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  let baseline = 0.02;
  let blowTime = 0;

  return {
    /** Visszaadja a "szél" erősségét (0..1) és hogy elég hosszan fújt-e már */
    update(dt) {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const threshold = Math.max(0.07, baseline * 4);
      if (rms < threshold) {
        baseline += (rms - baseline) * Math.min(1, dt * 2);
        blowTime = Math.max(0, blowTime - dt * 0.5);
      } else {
        blowTime += dt;
      }
      const wind = Math.min(1, Math.max(0, (rms - baseline * 1.5) / 0.2));
      return { wind, blown: blowTime > 0.35 };
    },
    stop() {
      stream.getTracks().forEach((t) => t.stop());
      ac.close();
    },
  };
}
