import { EventEmitter } from "events";
import { Response } from "express";
import openAIClient from "lib/openAIClient";
import { OpenAI } from "openai";
import { AssistantStreamEvent } from "openai/resources/beta/assistants";
class EventHandler extends EventEmitter {
  client: OpenAI;
  constructor(client: OpenAI) {
    super();
    this.client = client;
  }
  async onEvent(event: AssistantStreamEvent, res: Response) {
    // console.log(event);
    // Retrieve events that are denoted with 'requires_action'
    // since these will have our tool_calls
    if (event.event === "thread.run.requires_action") {
      await this.handleRequiresAction({
        run: event.data,
        runId: event.data.id,
        threadId: event.data.thread_id,
        res,
      });
    } else if (event.event === "thread.message.delta") {
      if (event.data.delta.content) {
        if (event.data.delta.content[0].type === "text") {
          if (event.data.delta.content[0].text) {
            res.write(event.data.delta.content[0].text.value);
          }
        }
      }
    } else if (event.event === "thread.run.completed") {
      res.end();
    }
  }

  async handleRequiresAction({
    run,
    runId,
    threadId,
    res,
  }: {
    run: OpenAI.Beta.Threads.Runs.Run;
    runId: string;
    threadId: string;
    res: Response;
  }) {
    if (run.required_action) {
      const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] =
        [];
      for (const toolCall of run.required_action.submit_tool_outputs
        .tool_calls) {
        if (toolCall.function.name === "getCurrentTemperature") {
          const result = {
            tool_call_id: toolCall.id,
            output: "100",
          };
          toolOutputs.push(result);
        } else if (toolCall.function.name === "getRainProbability") {
          const result = {
            tool_call_id: toolCall.id,
            output: "0.06",
          };
          toolOutputs.push(result);
        } else {
          throw new Error("Unknown function name: " + toolCall.function.name);
        }
      }
      // Submit all the tool outputs at the same time
      await this.submitToolOutputs({ toolOutputs, runId, threadId, res });
    }
  }

  async submitToolOutputs({
    res,
    runId,
    threadId,
    toolOutputs,
  }: {
    toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[];
    runId: string;
    threadId: string;
    res: Response;
  }) {
    // Use the submitToolOutputsStream helper
    const stream = this.client.beta.threads.runs.submitToolOutputsStream(
      threadId,
      runId,
      { tool_outputs: toolOutputs }
    );
    for await (const event of stream) {
      this.emit("event", event, res);
    }
  }
}

export const eventHandler = new EventHandler(openAIClient);
eventHandler.on("event", eventHandler.onEvent.bind(eventHandler));
