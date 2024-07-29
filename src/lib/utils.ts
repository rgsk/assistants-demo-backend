import fs from "fs";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const readFile = async (filePath: string) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return data.toString();
  } catch (error: any) {
    throw new Error(`Error reading file: ${error.message}`);
  }
};

export const writeFile = async (filePath: string, data: string) => {
  try {
    await fs.promises.writeFile(filePath, data);
  } catch (error: any) {
    throw new Error(`Error writing file: ${error.message}`);
  }
};
