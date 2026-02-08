import { styleText } from "node:util";

/**
 * @param {ReadableStreamDefaultReader<Uint8Array>} reader
 */
export async function* readBedrockStreamEvents(reader) {
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
          const parsedEvent = JSON.parse(anthropicEvent);
          yield parsedEvent;
        } else if (json.message) {
          console.error(
            styleText(
              "yellow",
              `Bedrock message received: ${JSON.stringify(json.message)}`,
            ),
          );
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(
            styleText(
              "red",
              `Error decoding payload: ${err.message}\nPayload: ${decodedPayload}`,
            ),
          );
        }
      }

      buffer = buffer.slice(totalLength);
    }
  }
}
