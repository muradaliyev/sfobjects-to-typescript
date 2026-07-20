import { Temporal } from "@js-temporal/polyfill";
export type SingleOrArray<T> = (T | T[]);
export declare function isPlainDate(value: unknown): value is Temporal.PlainDate;
export declare function isZonedDateTime(value: unknown): value is Temporal.ZonedDateTime;
export declare function isPlainTime(value: unknown): value is Temporal.PlainTime;
export declare function isPlainObject(value: unknown): value is Record<string, any>;
export declare function pluralize<T>(v: SingleOrArray<T>): T[];
export declare function uniq<T>(aa: T[]): T[];
