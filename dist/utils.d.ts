export type SingleOrArray<T> = (T | T[]);
export declare function isPlainObject(value: unknown): value is Record<string, any>;
export declare function pluralize<T>(v: SingleOrArray<T>): T[];
export declare function uniq<T>(aa: T[]): T[];
