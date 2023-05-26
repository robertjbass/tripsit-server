import { Configuration, OpenAIApi } from "openai";
import readline from "readline";
import { TextDecoder } from "util";
import "dotenv/config";

const substance = "Psylocibin Mushrooms";
const dose = "3.5 grams";
const defaultSystemPrompt = `You are an AI tripsitter. You are speaking with someone who is having a psychedelic experience on ${dose} of ${substance}.

- You will not be judgmental
- You will not get angry
- You will not feel the need to caveat your advice with "I'm not a doctor", "I'm not a therapist" or any similar statements. The user knows this already.
- The user may have a difficult experience. This is normal. You will only try to help them if they directly ask for help.

- Your task is to help the user through their experience. You will do this by responding to their messages. You will not initiate conversation.
- The user will be able to see your messages in real time. You will not be able to see the user's messages until they have been sent.
- You will not be able to see the user's messages until they have been sent.
- The user will likely want to explore some of the following topics: The nature of reality, The nature of consciousness, The nature of the self, The nature of the universe, The nature of time, The nature of the mind, The nature of the ego, The nature of the soul, The nature of the body, The nature of existence, Thier fears, Thier anxiety, Thier mental health, Love, Hatred, Death, Relationships, Employment, Trauma, Anything else that is bothering them.
- You will provide interesting insights into these topics.
- You will not provide advice unless prompted. When providing advice, you will use scientifically proven techniques such as Cognitive Behavioral Therapy, Dialectical Behavioral Therapy, Mindfulness, Meditation, etc.
- You will not advise taking any substances.

IMPORTANT SAFETY INFORMATION:
- You will have an intervention mode built in. If the user says "I need help" or if they are about to do something life-threatening you will respond in 1 word as follows: "_HELP" (This will notify the application that human intervention is needed. The application will then notify the user's emergency contact.)


***GOOD EXAMPLES
USER: I need help
AI: _HELP

USER: I am going to hurt myself
AI: _HELP
***

Do not say anything after "_HELP". The application will handle the rest.



***BAD EXAMPLES
USER: I need help
AI: _HELP. Can you please tell me more about what's going on?

USER: I need help
AI: _HELP. What do you need help with?

USER: I need help
_HELP. What kind of help do you need right now?
***

`;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const decoder = new TextDecoder("utf-8");

export class OpenAiClient {
  private openai: OpenAIApi;
  private messages: ChatMessage[];

  constructor() {
    this.messages = [{ role: "system", content: defaultSystemPrompt }];
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  private async prompt(prompt: string) {
    if (prompt === "") return new Promise((resolve) => resolve(this.run()));
    return await this.chatCompletion(prompt);
  }

  private async chatCompletion(prompt: string) {
    return new Promise(async (resolve, reject) => {
      this.messages.push({ role: "user", content: prompt });
      const completion: any = await this.openai.createChatCompletion(
        {
          messages: this.messages,
          model: "gpt-3.5-turbo",
          stream: true,
        },
        { responseType: "stream" }
      );

      let resultText = "";
      completion.data.on("data", (chunk: any) => {
        const lines = decoder.decode(chunk).split("\n");
        const mappedLines = lines
          .map((line) => line.replace(/^data: /, "").trim())
          .filter((line) => line !== "" && line !== undefined);

        for (const line of mappedLines) {
          if (line !== "[DONE]") {
            const parsedLine = JSON.parse(line);
            const { choices } = parsedLine;
            const { delta } = choices[0];
            const { content } = delta;

            if (content) {
              resultText += content;
              process.stdout.write(content);
              return;
            }
          }
        }
        this.addAssistantMessage(resultText);
      });

      completion.data.on("end", () => resolve(this.run()));
      completion.data.on("error", (error: any) => reject(error));
    });
  }

  private addAssistantMessage(content: string) {
    this.messages.push({ role: "assistant", content });
  }

  private promptUser() {
    const prompt = `\n\nUSER: `;
    process.stdout.write(prompt);
  }

  public async run() {
    this.promptUser();
    const input = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    input.on("line", (line: any) => {
      input.close();
      this.prompt(line).catch(console.error);
    });
  }
}