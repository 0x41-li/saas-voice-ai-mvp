import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { audio, format } = await request.json();

    if (!audio) {
      return NextResponse.json(
        { error: "No audio provided" },
        { status: 400 }
      );
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(audio, "base64");

    // Determine file extension based on format
    const extension = format === "mp4" ? "mp4" : format === "wav" ? "wav" : "webm";
    const mimeType = format === "mp4" ? "audio/mp4" : format === "wav" ? "audio/wav" : "audio/webm";

    // Transcribe audio using Whisper (accepts webm, mp4, wav, etc.)
    const audioFile = await toFile(audioBuffer, `audio.${extension}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    if (!transcription.text || transcription.text.trim() === "") {
      return NextResponse.json(
        { error: "Could not understand audio. Please try again." },
        { status: 400 }
      );
    }

    // Get response from GPT-4o
    const chatResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful voice assistant. Keep responses concise (1-3 sentences) and conversational, suitable for spoken delivery. Respond naturally as if having a conversation.",
        },
        {
          role: "user",
          content: transcription.text,
        },
      ],
    });

    const responseText = chatResponse.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(
        { error: "No response generated" },
        { status: 500 }
      );
    }

    // Convert response to speech using TTS
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: responseText,
      response_format: "mp3",
    });

    // Get audio as buffer and convert to base64
    const ttsBuffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioBase64 = ttsBuffer.toString("base64");

    return NextResponse.json({
      audio: audioBase64,
      audioFormat: "mp3",
      transcript: transcription.text,
      response: responseText,
    });
  } catch (error) {
    console.error("Voice API error:", error);

    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process voice request" },
      { status: 500 }
    );
  }
}
