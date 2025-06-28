(async () => {
  // const model = "gemini-2.5-flash-preview-05-20";
  const model = "gemini-2.5-pro-preview-05-06";
  const apiKey = process.env.GEMINI_API_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(120 * 1000),
      body: JSON.stringify({
        // system_instruction: {
        //   parts: [{ text: SYSTEM_INSTRUCTION }],
        // },
        generationConfig: {
          temperature: 0,
          thinkingConfig: {
            includeThoughts: true,
            // 2025-05-22時点では、Gemini 2.5 Flash のみサポート。Proでは無視される。
            thinkingBudget: 2048,
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
            parts: [
              {
                // text: "こんにちは、あなたは何ができますか？",
                // text: "今日の東京、バンコク、台北、パリの天気は？",
                text: "1から1000までの和は？",
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
    },
  );

  console.log("Response status:", response.status);

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
