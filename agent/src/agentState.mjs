/**
 * @import { Message } from "./model"
 */

/**
 * @typedef {ReturnType<typeof createStateManager>} StateManager
 */

/**
 * @typedef {Object} StateEventHandlers
 * @property {(messages: Message[]) => void} onMessagesAppended
 */

/**
 * Creates a state manager for message handling.
 * @param {Message[]} initialMessages
 * @param {StateEventHandlers} handlers
 */
export function createStateManager(initialMessages, handlers) {
  /** @type {Message[]} */
  let messages = [...initialMessages];

  return {
    /** Get all messages (immutable copy) */
    getMessages: () => [...messages],

    /** Get message at specific index (supports -1 for last) */
    getMessageAt: /** @param {number} index */ (index) => messages.at(index),

    /** Append messages */
    appendMessages: /** @param {Message[]} newMessages */ (newMessages) => {
      messages = [...messages, ...newMessages];
      handlers.onMessagesAppended(newMessages);
    },

    /** Replace all messages */
    setMessages: /** @param {Message[]} newMessages */ (newMessages) => {
      messages = [...newMessages];
    },
  };
}
