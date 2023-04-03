import { Configuration, OpenAIApi } from "openai";
import type { ChatCompletionRequestMessage } from "openai";
import dotenv from "dotenv";
import readline from "readline";
dotenv.config();

const configuration = new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

let memory: ChatCompletionRequestMessage[] = [];

const askQuestion = async () => {
	rl.question("Enter your message: ", async (message) => {
		memory.push({ role: "user", content: message });
		let answer = "";
		for await (const token of streamChatCompletion()) {
			answer += token;
			process.stdout.write(token);
			// do something async here if you want
		}
		memory.push({ role: "assistant", content: answer });
		console.log("\n");
		if (message.toLowerCase() === "quit") {
			rl.close();
		} else {
			askQuestion();
		}
	});
};

askQuestion();

async function* streamChatCompletion() {
	const response = await openai.createChatCompletion(
		{
			model: "gpt-3.5-turbo",
			messages: memory,
			stream: true,
		},
		{
			responseType: "stream",
		}
	);

	for await (const chunk of response.data) {
		const lines = chunk
			.toString("utf8")
			.split("\n")
			.filter((line) => line.trim().startsWith("data: "));

		for (const line of lines) {
			const message = line.replace(/^data: /, "");
			if (message === "[DONE]") {
				return;
			}

			const json = JSON.parse(message);
			const token = json.choices[0].delta.content;
			if (token) {
				yield token;
			}
		}
	}
}
