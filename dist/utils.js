"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlainDate = isPlainDate;
exports.isZonedDateTime = isZonedDateTime;
exports.isPlainTime = isPlainTime;
exports.isPlainObject = isPlainObject;
exports.pluralize = pluralize;
exports.uniq = uniq;
// Utils
function isPlainDate(value) {
    return toString.call(value) === "[object Temporal.PlainDate]";
}
function isZonedDateTime(value) {
    return toString.call(value) === "[object Temporal.ZonedDateTime]";
}
function isPlainTime(value) {
    return toString.call(value) === "[object Temporal.PlainTime]";
}
function isPlainObject(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    if (Object.prototype.toString.call(value) !== '[object Object]')
        return false;
    const proto = Object.getPrototypeOf(value);
    if (proto === null)
        return true;
    const Ctor = Object.prototype.hasOwnProperty.call(proto, 'constructor') && proto.constructor;
    return (typeof Ctor === 'function' &&
        Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value));
}
function pluralize(v) {
    if (v !== undefined) {
        return Array.isArray(v) ? v : [v];
    }
    return [];
}
function uniq(aa) {
    return [...new Set(aa)];
}
