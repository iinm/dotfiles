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
      const payloadRaw = buffer.slice(
        payloadOffset,
        payloadOffset + payloadLength,
      );

      const payloadDecoded = new TextDecoder().decode(payloadRaw);
      try {
        const payloadParsed = JSON.parse(payloadDecoded);
        if (payloadParsed.bytes) {
          const event = Buffer.from(payloadParsed.bytes, "base64").toString(
            "utf-8",
          );
          const eventParsed = JSON.parse(event);
          yield eventParsed;
        } else if (payloadParsed.message) {
          console.error(
            styleText(
              "yellow",
              `Bedrock message received: ${JSON.stringify(payloadParsed.message)}`,
            ),
          );
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(
            styleText(
              "red",
              `Error decoding payload: ${err.message}\nPayload: ${payloadDecoded}`,
            ),
          );
        }
      }

      buffer = buffer.slice(totalLength);
    }
  }
}
