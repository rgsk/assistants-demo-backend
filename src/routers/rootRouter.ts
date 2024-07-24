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
