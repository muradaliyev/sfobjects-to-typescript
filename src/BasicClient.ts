import { Connection } from "jsforce";
import { Temporal } from "@js-temporal/polyfill";
import { SingleOrArray, isPlainDate, isZonedDateTime, isPlainTime, pluralize, isPlainObject, uniq } from "./utils";


// **** Common types



type SfPrimitiveType = string | number | boolean | bigint;

type OnlyObjects<S> = S extends object ? S : never;

type OnlyStrings<S> = S extends string ? S : never;



interface SfSelectStatement<T = any> { select: T[]; }

interface SfWhereStatement<T = any> { where?: T; }

interface SfFromStatement<N> { from: N; }

interface SfLimitStatement { limit?: number; }

// Objects Index

interface SfObject<O = {}, DK = string, DTK = string, TK = string> {
    ObjectType: O;
    DateTypes: DK;
    DateTimeTypes: DTK;
    TimeTypes: TK;
}

type SfObjectsIndex = Record<string, SfObject>;
type GetObjType<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['ObjectType'];
type GetObjectTypes<OI extends SfObjectsIndex> = { [K in keyof OI]: GetObjType<OI, K> }[keyof OI];
type GetSfObject<O, OI extends SfObjectsIndex> = { [N in keyof OI]: O extends GetObjType<OI, N> ? OI[N] : never }[keyof OI];

type BaseSfObject = { readonly Id: string; }

type ChildTable<O = BaseSfObject> = { totalSize: number, done: boolean, records: O[] }

// Where

const OP_KEY_AND = '__and';
const OP_KEY_OR = '__or';
const OP_KEY_NOT = '__not';

const OP_KEYS_EQ = ['eq', 'equals', '=', '=='] as const;
const OP_KEYS_NE = ['ne', '!=', '<>'] as const;
const OP_KEYS_LT = ['lt', '<', 'less than'] as const;
const OP_KEYS_LTE = ['lte', '<=', 'less than or equal'] as const;
const OP_KEYS_GT = ['gt', '>', 'greater than'] as const;
const OP_KEYS_GTE = ['gte', '>=', 'greater than or equal'] as const;
const OP_KEYS_IN = ['in'] as const;
const OP_KEYS_NIN = ['nin', 'not in'] as const;
const OP_KEYS_LIKE = ['like'] as const;
const OP_KEYS_NLIKE = ['nlike', 'not like'] as const;

const SINGULAR_OP_KEYS = [
    ...OP_KEYS_EQ,
    ...OP_KEYS_NE,
    ...OP_KEYS_LT,
    ...OP_KEYS_GT,
    ...OP_KEYS_LTE,
    ...OP_KEYS_GTE,
    ...OP_KEYS_LIKE,
    ...OP_KEYS_NLIKE
] as const;

const PLURAL_OP_KEYS = [
    ...OP_KEYS_IN,
    ...OP_KEYS_NIN
] as const;

const LOGICAL_OP_KEYS = [
    OP_KEY_AND,
    OP_KEY_OR,
    OP_KEY_NOT
] as const;

type SfSingularOpKeys = typeof SINGULAR_OP_KEYS[number];
type SfPluralOpKeys = typeof PLURAL_OP_KEYS[number];
type SfLogicalOpKeys = typeof LOGICAL_OP_KEYS[number];
type SfValueOpKeys = SfSingularOpKeys | SfPluralOpKeys;

interface SfOpRule {
    ops: readonly SfValueOpKeys[];
    isNot?: boolean;
    isPlural?: boolean;
    soqlOp: string;
}

const OP_RULES: SfOpRule[] = [
    { ops: OP_KEYS_EQ, soqlOp: '=' },
    { ops: OP_KEYS_NE, soqlOp: '!=' },
    { ops: OP_KEYS_LT, soqlOp: '<' },
    { ops: OP_KEYS_LTE, soqlOp: '<=' },
    { ops: OP_KEYS_GT, soqlOp: '>' },
    { ops: OP_KEYS_GTE, soqlOp: '>=' },
    { ops: OP_KEYS_IN, soqlOp: 'in', isPlural: true },
    { ops: OP_KEYS_NIN, soqlOp: 'in', isNot: true, isPlural: true },
    { ops: OP_KEYS_LIKE, soqlOp: 'like' },
    { ops: OP_KEYS_NLIKE, soqlOp: 'like', isNot: true },
]

export interface SfWhereOp<OP extends SfValueOpKeys, V> {
    op: OP;
    value: V;
}

export type SfPrimitiveWhereKeys<O> = { [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : never }[keyof O];

export type SfParentRelWhereKeys<O, OI extends SfObjectsIndex> = { [K in keyof O]: NonNullable<O[K]> extends GetObjectTypes<OI> ? K : never }[keyof O];

export type ValOrDate<K extends keyof OB['ObjectType'], OB extends SfObject> = K extends OB['DateTypes'] ? Temporal.PlainDate : K extends OB['DateTimeTypes'] ? Temporal.ZonedDateTime : K extends OB['TimeTypes'] ? Temporal.PlainTime : OB['ObjectType'][K];

export type SfPrimitiveWhere<OB extends SfObject> = {
    [K in SfPrimitiveWhereKeys<OB['ObjectType']>]+?: SingleOrArray<ValOrDate<K, OB>> | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, ValOrDate<K, OB>> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, ValOrDate<K, OB>[]> }[SfPluralOpKeys]
}

export type SfParentRelWhere<OB extends SfObject, OI extends SfObjectsIndex> = {
    [K in SfParentRelWhereKeys<OB['ObjectType'], OI>]+?: SfWhere<GetSfObject<NonNullable<OB['ObjectType'][K]>, OI>, OI>
}

export type SfLogicalWhere<OB extends SfObject, OI extends SfObjectsIndex> = {
    [K in SfLogicalOpKeys]: SfWhere<OB, OI>;
}

export type SfWhere<OB extends SfObject, OI extends SfObjectsIndex> = SfPrimitiveWhere<OB> | SfParentRelWhere<OB, OI> | SfLogicalWhere<OB, OI>;

// select

export type SfSelectAndWhereParts<OB extends SfObject, OI extends SfObjectsIndex> = SfSelectStatement<SfSelection<OB['ObjectType'], OI>> & SfWhereStatement<SfWhere<OB, OI>>;

export type SfChildRelSelection<O, OI extends SfObjectsIndex> = {
    [K in keyof O]: NonNullable<O[K]> extends ChildTable<GetObjectTypes<OI>> ? { [P in K]: SfSelectAndWhereParts<GetSfObject<NonNullable<O[K]>['records'][0], OI>, OI> /*| SfSelection<NonNullable<O[K]>['records'][0], OI>[]*/ } : never
}[keyof O];

export type SParentRelSelection<O, OI extends SfObjectsIndex> = {
    [K in keyof O]: NonNullable<O[K]> extends GetObjectTypes<OI> ? { [P in K]: SfSelection<NonNullable<O[K]>, OI>[] } : never
}[keyof O];

export type SfPrimitiveSelection<O> = {
    [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : never
}[keyof O];

export type SfSelection<O, OI extends SfObjectsIndex> = SParentRelSelection<O, OI> | SfChildRelSelection<O, OI> | SfPrimitiveSelection<O>;

// Root Query

export type SfSelectionFromIndex<OI extends Record<string, SfObject>, N extends OnlyStrings<keyof OI>> = SfSelection<GetObjType<OI, N>, OI>;

export type SfWhereFromIndex<OI extends Record<string, SfObject>, N extends OnlyStrings<keyof OI>> = SfWhere<OI[N], OI>;

export type SfRootQuery<OI extends Record<string, SfObject>> = {
    [N in OnlyStrings<keyof OI>]: SfSelectStatement<SfSelectionFromIndex<OI, N>> & SfWhereStatement<SfWhereFromIndex<OI, N>> & SfFromStatement<N> & SfLimitStatement
}[OnlyStrings<keyof OI>]


// projection

export type SfPrjPrimitiveKeys<O, S> = { [K in keyof O]: S extends K ? NonNullable<O[K]> extends SfPrimitiveType ? K : never : never }[keyof O];

export type SfPrjParentRelKeys<O, S> = { [K in keyof O]: S extends object ? { [SK in Extract<keyof S, K>]: NonNullable<O[K]> extends object ? NonNullable<O[K]> extends ChildTable ? never : K : never }[Extract<keyof S, K>] : never }[keyof O];

export type SfPrjChildRelKeys<O, S> = { [K in keyof O]: S extends object ? { [SK in Extract<keyof S, K>]: NonNullable<O[K]> extends ChildTable ? K : never }[Extract<keyof S, K>] : never }[keyof O];


export type SfPrimitiveSelectProjection<O, S> = { [K in SfPrjPrimitiveKeys<O, S>]: O[K] };

export type SfParentRelSelectProjection<O, S extends object> = {
    [K in SfPrjParentRelKeys<O, S>]: {
        [SK in Extract<keyof S, K>]: NonNullable<S[SK]> extends any[] ? SfSelectProjection<NonNullable<O[SK]>, NonNullable<S[SK]>[0]> : NonNullable<S[SK]> extends SfSelectStatement ? never : never
    }[Extract<keyof S, K>]
};

export type SfChildRelSelectProjection<O, S extends object> = {
    [K in SfPrjChildRelKeys<O, S>]: {
        [SK in Extract<keyof S, K>]: NonNullable<S[SK]> extends SfSelectStatement ? NonNullable<O[SK]> extends ChildTable ? ChildTable<SfSelectProjection<NonNullable<O[SK]>['records'][0], NonNullable<S[SK]>['select'][0]>> : never : never
    }[Extract<keyof S, K>]
};

export type SfSelectProjection<O, S> = SfPrimitiveSelectProjection<O, OnlyStrings<S>> & SfParentRelSelectProjection<O, OnlyObjects<S>> & SfChildRelSelectProjection<O, OnlyObjects<S>>;

export type SfQueryProjection<OI extends Record<string, SfObject>, Q extends SfRootQuery<OI>> = SfSelectProjection<GetObjType<OI, Q['from']>, Q['select'][0]>;



function escapeVal(v: any): string {


    if (typeof v === 'string') {
        return `'${v}'`;
    }

    // if (_.isDate(v)) {
    //     return v.toDateString();
    // }

    if (isPlainDate(v)) {
        return v.toJSON();
    }

    if (isZonedDateTime(v)) {

        return (v
            .toInstant()
            .toString({
                smallestUnit: "millisecond",
                fractionalSecondDigits: 3,
            })
            .replace("Z", "+0000"));
    }

    if (isPlainTime(v)) {
        return v.toJSON();
    }

    if (typeof v === 'boolean' || typeof v === 'number' || typeof v === 'bigint') {
        return String(v);
    }

    if (v === null) {
        return 'null';
    }

    throw `Unupported value type for where statement`;

}

function processWhereStatement(where: Record<string, any>, o?: { prefixes?: string[], isLogicalOr?: boolean, isLogicalNot?: boolean }) {

    const { prefixes, isLogicalNot, isLogicalOr } = o || {};

    const whereStatements = Object.keys(where)
        .map((k): (string | undefined) => {

            const v = where[k];

            if (LOGICAL_OP_KEYS.includes(k as any)) {

                if (isPlainObject(v)) {
                    return processWhereStatement(v, { prefixes, isLogicalOr: (k === OP_KEY_OR), isLogicalNot: (k === OP_KEY_NOT) });
                }
            }

            else {

                if (isPlainObject(v)) {

                    const { op, value, values, ...rest } = v;

                    const _value = values ?? value;

                    if (op !== undefined && _value !== undefined) {

                        const opRule = OP_RULES.find(r => r.ops.some(rop => (rop === op)));

                        if (opRule) {

                            const { soqlOp, isNot, isPlural } = opRule;

                            if ((isPlural ?? false) === Array.isArray(_value)) {


                                return [
                                    isNot ? 'not (' : '',
                                    [...(prefixes || []), k].join('.'),
                                    soqlOp,
                                    Array.isArray(_value) ? `(${_value.map(escapeVal).join(',')})` : escapeVal(_value),
                                    isNot ? ')' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ');
                            }
                        }
                    }

                    else if (op === undefined && value === undefined) {

                        return processWhereStatement(rest, { prefixes: [...(prefixes || []), k] })
                    }

                }
                else if (Array.isArray(v)) {
                    return `${k} in (${v.map(escapeVal).join(',')})`;
                }
                else {
                    return `${k} = ${escapeVal(v)}`;
                }
            }
        })
        .filter(Boolean);


    if (whereStatements.length) {

        const joinedStatements = `(${whereStatements.join(isLogicalOr ? ') or (' : ') and (')})`;

        if (isLogicalNot) {
            return whereStatements.length > 1 ? `not (${joinedStatements})` : `not ${joinedStatements}`;
        }

        return joinedStatements;
    }
}


function constructWhereStatement(where?: string | Record<string, any>) {

    if (where) {

        if (typeof where === 'string') {
            return where;
        }

        const whereSt = processWhereStatement(where);

        if (whereSt?.length) {
            return `where ${whereSt}`;
        }
    }
}

function constructFullQuery(from: string, select: (string | {})[], where?: string | Record<string, any>, limit?: number): string {

    return [
        'select',
        constructSelectStatement(select),
        'from',
        from,
        constructWhereStatement(where),
        limit ? `limit ${limit}` : ''
    ]
        .filter(Boolean)
        .join(' ');
}


function constructSelectStatement(select: (string | {})[], prefixes: string[] = []): string {

    return [
        ...uniq(select.filter(st => (typeof st === 'string'))).map(st => [...prefixes, st].join('.')),
        ...select
            .filter(st => isPlainObject(st))
            .map(st => Object.keys(st)
                .map((rsk) => {

                    const rst = st[rsk];

                    if (Array.isArray(rst)) {
                        return constructSelectStatement(rst, [...prefixes, rsk])
                    }

                    if (isPlainObject(rst)) {

                        const { select, where } = rst;


                        if (Array.isArray(select)) {
                            return `(${constructFullQuery(rsk, select, where)})`;
                        }

                        // throw error???
                    }

                })
                .filter(Boolean)
                .join(', ')
            )
    ]
        .filter(Boolean)
        .join(', ');

}

export class BasicClient<OI extends Record<string, SfObject>> {


    constructor(protected _conn: Connection) { }


    exec<Q extends SfRootQuery<OI>>(query: Q) {
        return this._conn.query<SfQueryProjection<OI, Q>>(this.soql(query));
    }

    soql<Q extends SfRootQuery<OI>>(query: Q) {
        const { select, from, where, limit } = query;
        return constructFullQuery(from, select, where, limit);
    }

    query<Q extends SfRootQuery<OI>>(query: Q) {

        return ({
            query: () => query,
            exec: () => this.exec(query),
            soql: () => this.soql(query),
            limit: (limit: number) => this.query({ ...query, limit })
        })
    }

    select<N extends OnlyStrings<keyof OI>, S extends SfSelectionFromIndex<OI, N>>(from: N, pSelect: SingleOrArray<S>) {

        const select = pluralize(pSelect);

        return {
            select: <NS extends SfSelectionFromIndex<OI, N>>(nSelect: SingleOrArray<NS>) => this.select(from, [...select, ...pluralize(nSelect)]),
            where: <W extends SfWhereFromIndex<OI, N>>(where: W) => this.query({ from, select, where }),
            ...this.query({ from, select })
        }
    };


    from<N extends OnlyStrings<keyof OI>>(from: N) {
        return {
            select: <S extends SfSelectionFromIndex<OI, N>>(select: SingleOrArray<S>) => this.select(from, select)
        }
    };

}

