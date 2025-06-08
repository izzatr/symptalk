export interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

export const messages: Record<string, Message[]> = {}; 