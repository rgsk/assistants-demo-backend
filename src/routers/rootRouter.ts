import { Router } from "express";
import environmentVars from "lib/environmentVars";
import openAIClient from "lib/openAIClient";
import friendsRouter from "./children/friendsRouter";

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

export default rootRouter;
