const openai = require("openai");
const googleTTS = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
var path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const openaiApi = new openai.OpenAI({
  apiKey: process.env.OPENIA_KEY,
  dangerouslyAllowBrowser: true,
});

// const whisperOptions = {
//   modelName: "base",                   // default
//   // modelPath: "/custom/path/to/model.bin", // use model in a custom directory
//   whisperOptions: {
//     gen_file_txt: false,      // outputs .txt file
//     gen_file_subtitle: false, // outputs .srt file
//     gen_file_vtt: false,      // outputs .vtt file
//     timestamp_size: 10,       // amount of dialogue per timestamp pair
//     word_timestamps: true     // timestamp for every word
//   }
// }

let rec = null;
let audioStream = null;

const recordButton = document.getElementById("recordButton");
const transcribeButton = document.getElementById("transcribeButton");

recordButton.addEventListener("click", startRecording);
transcribeButton.addEventListener("click", transcribeText);

function startRecording() {

  let constraints = { audio: true, video: false }

  recordButton.disabled = true;
  transcribeButton.disabled = false;

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    const audioContext = new window.AudioContext();
    audioStream = stream;
    const input = audioContext.createMediaStreamSource(stream);
    rec = new Recorder(input, { numChannels: 1 })
    rec.record();

    document.getElementById("output").innerHTML = "Recording started..."
  }).catch(function (err) {
    recordButton.disabled = false;
    transcribeButton.disabled = true;
  });
}

function transcribeText() {
  document.getElementById("output").innerHTML = "Converting audio to text..."
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
    file: new File([blob], 'audio.wav')
  });

  document.getElementById("question").innerHTML = transcript.text;
  
  const completion = await openaiApi.completions.create({
    model: 'gpt-3.5-turbo-instruct',
    prompt: `Que tu respuesta sea breve y corta y nada de codigo o caracteres illegible 
    y solo responde preguntas relacionadas a la navidad, en caso de no ser una pregunta o 
    un tema relacionado a la navidad, responde con "No estoy autorizado a responder temas 
    fuera de la navidad, pero aqui te dejo un chiste navideño" y procedes a dar un chiste 
    navideño. "${transcript.text}"`,
    temperature: 0.7,
    max_tokens: 256,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  //console.log(completion)

  document.getElementById("output").innerHTML = // transcript.text
  completion.choices[0].text;
  //JSON.stringify(transcript);
}

// function sendToWhisper(blob) {
//   const filename = "sound-file-" + new Date().getTime() + ".wav";
//   const formData = new FormData();
//   formData.append("audio_data", blob, filename);

//   fetch('http://localhost:3000/notes', {
//     method: 'POST',
//     body: formData
//   }).then(async result => {
//     document.getElementById("output").innerHTML = await result.text();
//   }).catch(error => {
//     document.getElementById("output").innerHTML = "An error occurred: " + error;
//   })
// }

// function replayBlob(blob) {
//   var blobURL = window.URL.createObjectURL(blob);
//   var audio0 = new Audio(blobURL);
//   audio0.play();
// }

// function getAudioContext() {
//   if (!window.AudioContext) {
//     if (!window.webkitAudioContext) {
//       alert("Your browser does not support any AudioContext and cannot play back this audio.");
//       return;
//     }
//     window.AudioContext = window.webkitAudioContext;
//   }

//   context = new AudioContext();

//   return context;
// }

// // Play the loaded file
// function play(buf) {
//   // Create a source node from the buffer
//   const context = getAudioContext();
