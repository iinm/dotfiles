(async () => {
  if (!process.env.BEDROCK_API_KEY) {
    console.error("Error: BEDROCK_API_KEY is not set");
    process.exit(1);
  }

  const modelId = "jp.anthropic.claude-haiku-4-5-20251001-v1:0";
  const response = await fetch(
    `https://bedrock-runtime.ap-northeast-1.amazonaws.com/model/${modelId}/invoke-with-response-stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.BEDROCK_API_KEY}`,
      },
      signal: AbortSignal.timeout(120 * 1000),
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "こんにちは" }],
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

    const nextBuffer = new Uint8Array(buffer.length + value.length);
    nextBuffer.set(buffer);
    nextBuffer.set(value, buffer.length);
    buffer = nextBuffer;

    // AWS event stream format
    // https://github.com/awslabs/aws-c-event-stream/blob/main/docs/images/encoding.png
    while (buffer.length >= 12) {
      const view = new DataView(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength,
      );
      const totalLength = view.getUint32(0);
      const headersLength = view.getUint32(4);

      if (buffer.length < totalLength) {
        break;
      }

      const payloadOffset = 12 + headersLength;
      // prelude 12 bytes + CRC 4 bytes = 16
      const payloadLength = totalLength - headersLength - 16;
      const payload = buffer.slice(
        payloadOffset,
        payloadOffset + payloadLength,
      );

      const decodedPayload = new TextDecoder().decode(payload);
      try {
        const json = JSON.parse(decodedPayload);
        if (json.bytes) {
          const anthropicEvent = Buffer.from(json.bytes, "base64").toString(
            "utf-8",
          );
          console.log("--- Data ---");
          console.log(anthropicEvent);
        } else if (json.message) {
          console.log("--- Message ---");
          console.log(json.message);
        }
      } catch (e) {
        console.log("--- Error decoding payload ---");
        console.error(e);
      }

      buffer = buffer.slice(totalLength);
    }
  }
})();
