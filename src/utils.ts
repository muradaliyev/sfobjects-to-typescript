export type SingleOrArray<T> = (T | T[]);

// Utils

export function isPlainObject(value: unknown): value is Record<string, any> {
    if (typeof value !== 'object' || value === null) return false

    if (Object.prototype.toString.call(value) !== '[object Object]') return false

    const proto = Object.getPrototypeOf(value);

    if (proto === null) return true

    const Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
    return (
        typeof Ctor === 'function' &&
        Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value)
    );
}

export function pluralize<T>(v: SingleOrArray<T>): T[] {

    if (v !== undefined) {
        return Array.isArray(v) ? v : [v];
    }

    return [];
}

export function uniq<T>(aa: T[]) {
    return [...new Set(aa)];
}