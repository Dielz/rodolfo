const openai = require("openai");
const googleTTS = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })


//console.log(process.env.OPENAI_KEY);
const openaiApi = new openai.OpenAI({
  apiKey: process.env.OPENAI_KEY,
  dangerouslyAllowBrowser: true,
});

const gtts = new googleTTS.TextToSpeechClient();

let rec = null;
let audioStream = null;

const recordButton = document.getElementById("recordButton");
const transcribeButton = document.getElementById("transcribeButton");

recordButton.addEventListener("click", startRecording);
transcribeButton.addEventListener("click", transcribeText);

function startRecording() {
  let constraints = { audio: true, video: false };

  recordButton.disabled = true;
  transcribeButton.disabled = false;

  navigator.mediaDevices.getUserMedia(constraints)
    .then(function (stream) {
      const audioContext = new window.AudioContext();
      audioStream = stream;
      const input = audioContext.createMediaStreamSource(stream);
      rec = new Recorder(input, { numChannels: 1 });
      rec.record();

      document.getElementById("output").innerHTML = "Recording started...";
    })
    .catch(function (err) {
      recordButton.disabled = false;
      transcribeButton.disabled = true;
    });
}

function transcribeText() {
  document.getElementById("output").innerHTML = "Converting audio to text...";
  transcribeButton.disabled = true;
  recordButton.disabled = false;
  rec.stop();
  audioStream.getAudioTracks()[0].stop();

  rec.exportWAV(uploadSoundData);
}

function uploadSoundData(blob) {
  transcript(blob);
}

async function transcript(blob) {
  const transcript = await openaiApi.audio.transcriptions.create({
    model: 'whisper-1',
    file: new File([blob], 'audio.wav'),
  });

  document.getElementById("question").innerHTML = transcript.text;

  const completion = await openaiApi.completions.create({
    model: 'gpt-3.5-turbo-instruct',
    prompt: `Que tu respuesta sea breve y corta y nada de código o caracteres ilegibles y
     solo responde preguntas relacionadas a la navidad, en caso de no ser una pregunta o 
     un tema relacionado a la navidad, responde con "No estoy autorizado a responder temas 
     fuera de la navidad, pero aquí te dejo un chiste navideño" y procedes a dar un chiste navideño. "${transcript.text}"`,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  document.getElementById("output").innerHTML = completion.choices[0].text;

  const request = {
    audioConfig: {
      audioEncoding: "LINEAR16",
      effectsProfileId: ["headphone-class-device"],
      pitch: 0,
      speakingRate: 1,
    },
    input: { text: completion.choices[0].text },
    voice: {
      languageCode: "es-US",
      name: "es-US-Studio-B",
    },
  };

  // Performs the text-to-speech request
  const [response] = await gtts.synthesizeSpeech(request);

  play(response.audioContent);
}

// Reproducir el audio sintetizado
function play(audioContent) {
  const audio = new Audio(URL.createObjectURL(new Blob([audioContent], { type: 'audio/mp3' })));
  audio.play();
}
