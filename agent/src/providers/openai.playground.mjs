(async () => {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    signal: AbortSignal.timeout(120 * 1000),
    body: JSON.stringify({
      model: "gpt-5",
      reasoning: { effort: "medium", summary: "auto" },
      input: [
        { role: "user", content: "1から1000までの整数の和は？" },
        // { role: "user", content: "Weather in Tokyo." },
      ],
      tools: [
        {
          type: "function",
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
      ],
      stream: true,
    }),
  });

  // console.log(await response.text());
  // return;

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

    const nextBuffer = new Uint8Array(buffer.length + value.length);
    nextBuffer.set(buffer);
    nextBuffer.set(value, buffer.length);
    buffer = nextBuffer;

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
