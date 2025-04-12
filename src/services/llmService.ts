import axios from "axios";

export async function callLLM(prompt: string): Promise<string> {
  const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL!;
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY!;
  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: "deepseek-chat", // or your actual model name
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices?.[0]?.message?.content || "";
}
