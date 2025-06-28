(async () => {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": `${process.env.ANTHROPIC_API_KEY}`,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(120 * 1000),
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 256,
      stream: true,
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
    const eventEndIndices = [];
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === lineFeed && buffer[i + 1] === lineFeed) {
        eventEndIndices.push(i);
      }
    }

    for (let i = 0; i < eventEndIndices.length; i++) {
      const eventStartIndex = i === 0 ? 0 : eventEndIndices[i - 1] + 2;
      const eventEndIndex = eventEndIndices[i];
      const event = buffer.slice(eventStartIndex, eventEndIndex);
      const decodedEvent = new TextDecoder().decode(event);
      // console.log("--- Event ---");
      // console.log(decodedEvent);
      const data = decodedEvent.split("\n").at(-1);
      console.log("--- Data ---");
      console.log(data);
    }

    if (eventEndIndices.length) {
      buffer = buffer.slice(eventEndIndices[eventEndIndices.length - 1] + 2);
    }
  }
})();
