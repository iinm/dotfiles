import { execSync } from "node:child_process";

(async () => {
  const model = "gemini-3-flash-preview";

  // Google AI Studio
  // const apiKey = process.env.GEMINI_API_KEY;
  // const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  // const headers = {};

  // Vertex AI
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const location = "global";
  // const location = /** @type {string} */ ("asia-northeast1");
  const url = `https://${location === "global" ? "" : `${location}-`}aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:streamGenerateContent?alt=sse`;

  const token = execSync("gcloud auth print-access-token").toString().trim();
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    signal: AbortSignal.timeout(120 * 1000),
    body: JSON.stringify({
      // system_instruction: {
      //   parts: [{ text: SYSTEM_INSTRUCTION }],
      // },
      generationConfig: {
        temperature: 1,
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE",
        },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE",
        },
      ],
      contents: [
        {
          role: "user",
          parts: [
            {
              // text: "こんにちは、あなたは何ができますか？",
              text: "今日の東京、バンコク、台北、パリの天気は？",
              // text: "1から1000までの和は？",
            },
          ],
        },
      ],
      tools: [
        {
          functionDeclarations: {
            name: "get_weather",
            description: "天気を取得する",
            parameters: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "場所",
                },
              },
              required: ["location"],
            },
          },
        },
      ],
    }),
  });

  console.log("Response status:", response.status);
  if (response.status >= 400) {
    console.log(await response.text());
    return;
  }

  if (!response.body) {
    throw new Error("Response body is empty");
  }

  const reader = response.body.getReader();

  let buffer = new Uint8Array();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    // const decodedValue = new TextDecoder().decode(value);
    // console.log("--- Value ---");
    // console.log(value.slice(-10));
    // console.log("--- Decoded Value ---");
    // console.log(decodedValue);

    buffer = new Uint8Array([...buffer, ...value]);

    const carriageReturn = "\r".charCodeAt(0);
    const lineFeed = "\n".charCodeAt(0);

    const dataEndIndices = [];
    for (let i = 0; i < buffer.length - 3; i++) {
      if (
        buffer[i] === carriageReturn &&
        buffer[i + 1] === lineFeed &&
        buffer[i + 2] === carriageReturn &&
        buffer[i + 3] === lineFeed
      ) {
        dataEndIndices.push(i);
      }
    }

    for (let i = 0; i < dataEndIndices.length; i++) {
      const dataStartIndex = i === 0 ? 0 : dataEndIndices[i - 1] + 4;
      const dataEndIndex = dataEndIndices[i];
      const data = buffer.slice(dataStartIndex, dataEndIndex);
      const decodedData = new TextDecoder().decode(data);
      console.log("--- Data ---");
      console.log(decodedData);
    }

    if (dataEndIndices.length) {
      buffer = buffer.slice(dataEndIndices[dataEndIndices.length - 1] + 4);
    }
  }
})();
