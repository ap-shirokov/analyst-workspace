// No persistent storage needed for this tool
export interface IStorage {}

export class MemStorage implements IStorage {}

export const storage = new MemStorage();
