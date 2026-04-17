import { Message } from "./message";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  starred?: boolean;
}
