(async () => {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_COMPATIBLE_API_KEY}`,
    },
    signal: AbortSignal.timeout(120 * 1000),
    body: JSON.stringify({
      model: "grok-code-fast-1",
      messages: [
        { role: "user", content: "Hello" },
        // { role: "user", content: "Weather in Tokyo." },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Get current temperature for a given location.",
            parameters: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "City and country e.g. Bogotá, Colombia",
                },
              },
              required: ["location"],
            },
          },
        },
      ],
      stream: true,
      stream_options: {
        include_usage: true,
      },
    }),
  });

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

    buffer = new Uint8Array([...buffer, ...value]);

    const lineFeed = "\n".charCodeAt(0);
    const dataEndIndices = [];
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === lineFeed && buffer[i + 1] === lineFeed) {
        dataEndIndices.push(i);
      }
    }

    for (let i = 0; i < dataEndIndices.length; i++) {
      const dataStartIndex = i === 0 ? 0 : dataEndIndices[i - 1] + 2;
      const dataEndIndex = dataEndIndices[i];
      const data = buffer.slice(dataStartIndex, dataEndIndex);
      const decodedData = new TextDecoder().decode(data);
      console.log("--- Data ---");
      console.log(decodedData);
    }

    if (dataEndIndices.length) {
      buffer = buffer.slice(dataEndIndices[dataEndIndices.length - 1] + 2);
    }
  }
})();
