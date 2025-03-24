export type ValuePattern =
  | string
  | RegExp
  | ((value: unknown) => boolean)
  | ValuePattern[]
  | { [key: string]: ValuePattern };
