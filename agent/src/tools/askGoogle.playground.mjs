import { createAskGoogleTool } from "./askGoogle.mjs";

(async () => {
  const askGoogleTool = createAskGoogleTool({
    apiKey: process.env.GEMINI_API_KEY ?? "",
  });

  const answer = await askGoogleTool.impl({ question: "明日の東京の天気は？" });
  console.log(answer);
})();
