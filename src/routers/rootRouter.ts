import { Router } from "express";
import environmentVars from "lib/environmentVars";
import openAIClient from "lib/openAIClient";
import friendsRouter from "./children/friendsRouter";
import { eventHandler } from "./eventHandler";
const rootRouter = Router();
rootRouter.use("/friends", friendsRouter);
rootRouter.get("/", async (req, res, next) => {
  try {
    return res.json({
      message: `Server is running on http://localhost:${environmentVars.PORT}`,
    });
  } catch (err) {
    return next(err);
  }
});

rootRouter.get("/threads/:threadId/messages", async (req, res, next) => {
  try {
    const { threadId } = req.params;
    const threadMessages = await openAIClient.beta.threads.messages.list(
      threadId
    );
    // console.log(threadMessages.data);
    const modifiedMessages = threadMessages.data.reverse().map((message) => {
      return {
        role: message.role,
        content: (message.content[0] as any).text.value,
      };
    });
    return res.json(modifiedMessages);
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/threads", async (req, res, next) => {
  try {
    const thread = await openAIClient.beta.threads.create();
    return res.json({ threadId: thread.id });
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/chat", async (req, res, next) => {
  try {
    const { threadId, assistantId, userMessage } = req.body;
    const message = await openAIClient.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage,
    });
    let run = await openAIClient.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
      // instructions:
      //   "Please address the user as Jane Doe. The user has a premium account.",
    });
    console.log(run);
    if (run.status === "completed") {
      const messages = await openAIClient.beta.threads.messages.list(
        run.thread_id
      );
      const content = (messages.data[0].content[0] as any).text.value;
      return res.json({ content });
    } else {
      throw new Error("Run status is not completed");
    }
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/chat-stream", async (req, res, next) => {
  try {
    const { threadId, assistantId, userMessage } = req.body;
    const message = await openAIClient.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage,
    });
    // We use the stream SDK helper to create a run with
    // streaming. The SDK provides helpful event listeners to handle
    // the streamed response.

    const run = openAIClient.beta.threads.runs
      .stream(threadId, {
        assistant_id: assistantId,
      })
      .on("textCreated", (text) => {
        // process.stdout.write("\nassistant > ")
      })
      .on("textDelta", (textDelta, snapshot) => {
        if (textDelta.value) {
          // process.stdout.write(textDelta.value);
          res.write(textDelta.value);
        }
      })
      .on("toolCallCreated", (toolCall) =>
        process.stdout.write(`\nassistant > ${toolCall.type}\n\n`)
      )
      .on("toolCallDelta", (toolCallDelta, snapshot) => {
        if (toolCallDelta.type === "code_interpreter") {
          if (toolCallDelta.code_interpreter?.input) {
            process.stdout.write(toolCallDelta.code_interpreter.input);
          }
          if (toolCallDelta.code_interpreter?.outputs) {
            process.stdout.write("\noutput >\n");
            toolCallDelta.code_interpreter.outputs.forEach((output) => {
              if (output.type === "logs") {
                process.stdout.write(`\n${output.logs}\n`);
              }
            });
          }
        }
      });
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/chat-stream-fn-calling", async (req, res, next) => {
  try {
    const { threadId, assistantId, userMessage } = req.body;
    const message = await openAIClient.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage,
    });
    const stream = openAIClient.beta.threads.runs.stream(
      threadId,
      { assistant_id: assistantId },
      eventHandler as any
    );

    for await (const event of stream) {
      eventHandler.emit("event", event, res);
    }
  } catch (err) {
    return next(err);
  }
});

export default rootRouter;
