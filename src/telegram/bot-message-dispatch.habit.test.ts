import { describe, expect, it, vi, beforeEach } from "vitest";

const deliverReplies = vi.hoisted(() => vi.fn());
const dispatchReplyWithBufferedBlockDispatcher = vi.hoisted(() => vi.fn());
const spawnSync = vi.hoisted(() => vi.fn());

vi.mock("./bot/delivery.js", () => ({ deliverReplies }));
vi.mock("../auto-reply/reply/provider-dispatcher.js", () => ({
  dispatchReplyWithBufferedBlockDispatcher,
}));
vi.mock("node:child_process", () => ({ spawnSync }));

import { dispatchTelegramMessage } from "./bot-message-dispatch.js";

describe("habit telegram short-circuit", () => {
  beforeEach(() => {
    deliverReplies.mockReset();
    dispatchReplyWithBufferedBlockDispatcher.mockReset();
    spawnSync.mockReset();
  });

  it("runs habit-dispatch and returns before LLM dispatch", async () => {
    spawnSync.mockReturnValue({ status: 0, stdout: JSON.stringify({ reply: "ok" }) });
    deliverReplies.mockResolvedValue({ delivered: true });

    const context = {
      ctxPayload: {},
      primaryCtx: { message: { chat: { id: 58705735, type: "private" } } },
      msg: {
        chat: { id: 58705735, type: "private" },
        message_id: 101,
        date: 1769910000,
        text: "#habit 운동 완료",
      },
      chatId: 58705735,
      isGroup: false,
      resolvedThreadId: undefined,
      replyThreadId: undefined,
      historyKey: undefined,
      historyLimit: 0,
      groupHistories: new Map(),
      route: { agentId: "default", accountId: "default" },
      skillFilter: undefined,
      sendTyping: vi.fn(),
      sendRecordVoice: vi.fn(),
      ackReactionPromise: null,
      reactionApi: null,
      removeAckAfterReply: false,
    };

    await dispatchTelegramMessage({
      context,
      bot: { api: {} },
      cfg: {},
      runtime: {},
      replyToMode: "first",
      streamMode: "off",
      textLimit: 4096,
      telegramCfg: {},
      opts: {},
      resolveBotTopicsEnabled: vi.fn().mockResolvedValue(false),
    });

    expect(spawnSync).toHaveBeenCalled();
    expect(deliverReplies).toHaveBeenCalled();
    expect(dispatchReplyWithBufferedBlockDispatcher).not.toHaveBeenCalled();
  });
});
