import { createInterface } from 'node:readline';
import type { ActivationPrompter } from '../services/devices/identityActivation.ts';

/**
 * Interactive prompts on a real terminal, for commands that ask a person for credentials.
 * Hidden input is read in raw mode and never echoed. It works only when both input and output
 * are terminals: a pipe, a file or the non-interactive tools of an agent are refused, so a
 * credential cannot be fed in through an argument, an environment variable or standard input.
 */

export const hasInteractiveTerminal = (): boolean =>
  Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);

/** The parts of a terminal input that the prompts use (replaceable in the tests). */
export interface TerminalInput {
  setRawMode(mode: boolean): unknown;
  resume(): unknown;
  pause(): unknown;
  setEncoding(encoding: BufferEncoding): unknown;
  on(event: 'data', listener: (chunk: string) => void): unknown;
  removeListener(event: 'data', listener: (chunk: string) => void): unknown;
}

export interface TerminalOutput {
  write(text: string): unknown;
}

export interface TtyPrompterOptions {
  input?: TerminalInput;
  output?: TerminalOutput;
  /** Called on Ctrl+C after the terminal was put back. Default: exit with code 130. */
  onInterrupt?: () => void;
}

export const createTtyPrompter = ({
  input = process.stdin as unknown as TerminalInput,
  output = process.stdout,
  onInterrupt = () => process.exit(130),
}: TtyPrompterOptions = {}): ActivationPrompter => {
  const askVisible = (question: string): Promise<string> =>
    new Promise((resolve) => {
      const lineReader = createInterface({
        input: input as unknown as NodeJS.ReadableStream,
        output: output as unknown as NodeJS.WritableStream,
        terminal: true,
      });
      lineReader.question(question, (answer) => {
        lineReader.close();
        resolve(answer);
      });
    });

  const askHidden = (question: string): Promise<string> =>
    new Promise((resolve) => {
      output.write(question);
      input.setRawMode(true);
      input.resume();
      input.setEncoding('utf8');

      let value = '';
      const restore = () => {
        input.removeListener('data', onData);
        input.setRawMode(false);
        input.pause();
        output.write('\n');
      };
      const onData = (chunk: string) => {
        for (const character of chunk) {
          if (character === '\r' || character === '\n' || character === '\u0004') {
            restore();
            resolve(value);
            return;
          }
          if (character === '\u0003') {
            restore();
            onInterrupt();
            resolve('');
            return;
          }
          if (character === '\u007f' || character === '\b') {
            value = value.slice(0, -1);
          } else if (character >= ' ') {
            value += character;
          }
        }
      };
      input.on('data', onData);
    });

  return {
    ask: askVisible,
    askHidden,
    say: (line) => {
      console.log(line);
    },
  };
};
