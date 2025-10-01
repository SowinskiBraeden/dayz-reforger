import { Readable } from "stream";

// cannot get a warning to go away, this is like the only solution
declare module "node:readline" {
  import { Interface, ReadLineOptions } from "readline";

  interface ReadLineOptionsFixed extends ReadLineOptions {
    input: Readable; // 👈 force Node stream
  }

  export function createInterface(options: ReadLineOptionsFixed): Interface;
}