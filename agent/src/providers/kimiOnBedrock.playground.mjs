import { Sha256 } from "@aws-crypto/sha256-js";
import { fromIni } from "@aws-sdk/credential-providers";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";

(async () => {
  const modelId = "moonshotai.kimi-k2.5";

  // with sso profile
  const region = "ap-northeast-1";
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke-with-response-stream`;
  const urlParsed = new URL(url);
  const { hostname, pathname } = urlParsed;

  const payload = {
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: "こんにちは" }],
      },
    ],
  };

  const signer = new SignatureV4({
    credentials: fromIni({ profile: process.env.AWS_PROFILE }),
    region,
    service: "bedrock",
    sha256: Sha256,
  });

  const req = new HttpRequest({
    protocol: "https:",
    method: "POST",
    hostname,
    path: pathname,
    headers: {
      host: hostname,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const signed = await signer.sign(req);

  const response = await fetch(url, {
    method: signed.method,
    headers: signed.headers,
    body: signed.body,
    signal: AbortSignal.timeout(120 * 1000),
  });

  console.log("Response status:", response.status);

  if (response.status >= 400) {
    throw new Error(`Response: ${await response.text()}`);
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
