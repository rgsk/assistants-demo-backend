import { Router } from "express";
import { db } from "lib/db";
import environmentVars from "lib/environmentVars";
import openAIClient from "lib/openAIClient";
import { z } from "zod";
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
    const modifiedMessages = threadMessages.data.reverse().map((message) => {
      return {
        id: message.id,
        role: message.role,
        content: (message.content[0] as any).text.value,
      };
    });
    return res.json(modifiedMessages);
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/messageFeedback", async (req, res, next) => {
  try {
    const { reaction, messageId, superPowerId, feedbackText } = req.body;
    const messageFeedback = await db.messageFeedback.create({
      data: {
        messageId,
        reaction,
        feedbackText,
        superPowerId,
      },
    });
    return res.json(messageFeedback);
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

const querySchema = z.object({
  userId: z.string(),
  assistantId: z.string(),
});

rootRouter.get("/conversations", async (req, res, next) => {
  try {
    const { userId, assistantId } = querySchema.parse(req.query);
    const conversations = await db.conversation.findMany({
      where: {
        userId: userId,
        assistantId: assistantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    // writeFile("src/conversations.json", JSON.stringify(conversations));
    return res.json(conversations);
    // return res.json(sampleConversations);
  } catch (err) {
    return next(err);
  }
});

// schema for request body
const createConversationSchema = z.object({
  threadId: z.string(),
  firstUserMessage: z.string(),
  assistantId: z.string(),
  userId: z.string(),
  superPowerId: z.string().optional(),
});

rootRouter.post("/conversations", async (req, res, next) => {
  try {
    const { threadId, firstUserMessage, assistantId, userId, superPowerId } =
      createConversationSchema.parse(req.body);
    const conversation = await db.conversation.create({
      data: {
        threadId,
        title: firstUserMessage,
        userId,
        assistantId,
        superPowerId,
      },
    });
    return res.json(conversation);
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
