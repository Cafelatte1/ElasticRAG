export interface Message {
  user: string;
  assistant?: string | null;
  doc_ids?: number[] | null;
  chunk_ids?: string[] | null;
}

export interface Chat {
  id: string;
  title: string;
  date: string;
  messages: Message[];
} 