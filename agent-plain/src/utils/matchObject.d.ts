export type ValuePattern = string | RegExp | ((value: unknown) => boolean);

export type ObjectPattern = {
  [key: string]:
    | ValuePattern
    | ObjectPattern
    | (ValuePattern | ObjectPattern)[];
};
