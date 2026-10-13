import { gql } from '@apollo/client'

export const ENSURE_CHAT_THREAD = gql`
  mutation EnsureChatThread($input: ChatThreadInput!) {
    ensureChatThread(input: $input) {
      _id
      memberId
      sessionId
      propertyId
      title
      status
      lastMessageAt
      createdAt
      updatedAt
      messages {
        _id
        threadId
        senderType
        content
        createdAt
        updatedAt
      }
    }
  }
`

export const GET_CHAT_THREAD = gql`
  query GetChatThread($input: ChatHistoryInput!) {
    getChatThread(input: $input) {
      _id
      memberId
      sessionId
      propertyId
      title
      status
      lastMessageAt
      createdAt
      updatedAt
      messages {
        _id
        threadId
        senderType
        content
        createdAt
        updatedAt
      }
    }
  }
`

export const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage($input: SendChatMessageInput!) {
    sendChatMessage(input: $input) {
      thread {
        _id
        memberId
        sessionId
        propertyId
        title
        status
        lastMessageAt
        createdAt
        updatedAt
        messages {
          _id
          threadId
          senderType
          content
          createdAt
          updatedAt
        }
      }
      userMessage {
        _id
        threadId
        senderType
        content
        createdAt
        updatedAt
      }
      assistantMessage {
        _id
        threadId
        senderType
        content
        createdAt
        updatedAt
      }
      messageCount
    }
  }
`
