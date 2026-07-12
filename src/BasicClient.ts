import { Connection } from "jsforce";
import { Temporal } from "@js-temporal/polyfill";
import { SingleOrArray, isPlainDate, isZonedDateTime, isPlainTime, pluralize, isPlainObject, uniq } from "./utils";
import { frm_Grant__c } from "./interfaces/frm_Grant__c";
import { SfObjects } from "./interfaces";


// **** Common types



type SfPrimitiveType = string | number | boolean | bigint;

type OnlyObjects<S> = S extends object ? S : never;

type OnlyStrings<S> = S extends string ? S : never;

type DeepnessLevel = '0' | '1' | '2' | '3' | 'overflow';

type IncrementDeepness<L extends DeepnessLevel> = L extends '0' ? '1' : L extends '1' ? '2' : L extends '2' ? '3' : L extends '3' ? 'overflow' : never;


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
type BaseSfObject = { readonly Id: string; }
type ChildTable<O = BaseSfObject> = { totalSize: number, done: boolean, records: O[] }
type GetChildProp<O, K extends keyof O> = NonNullable<O[K]> extends ChildTable ? NonNullable<O[K]>['records'][0] : never;

type ChildRelPropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends ChildTable ? GetObjNonNullProp<OI, N, K>['records'][0] extends GetObjectTypes<OI> ? K : never : never }[keyof GetObjType<OI, N>];
type ParentRelPropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends GetObjectTypes<OI> ? K : never }[keyof GetObjType<OI, N>];
type PrimitivePropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends SfPrimitiveType ? K : never }[keyof GetObjType<OI, N>];


type GetObjType<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['ObjectType'];
type GetObjDateTypes<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['DateTypes'];
type GetObjDateTimeTypes<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['DateTimeTypes'];
type GetObjTimeTypes<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['TimeTypes'];
type GetObjProp<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = GetObjType<OI, N>[K];
type GetObjNonNullProp<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = NonNullable<GetObjProp<OI, N, K>>;

type GetObjNonNullChildProp<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = GetChildProp<GetObjType<OI, N>, K>;

type GetSfObjectParentPropIndexKey<OI extends SfObjectsIndex, N extends keyof OI, K extends ParentRelPropKeys<OI, N>> = GetSfObjectIndexKey<GetObjNonNullProp<OI, N, K>, OI>;
type GetSfObjectChildPropIndexKey<OI extends SfObjectsIndex, N extends keyof OI, K extends ChildRelPropKeys<OI, N>> = GetSfObjectIndexKey<GetObjNonNullChildProp<OI, N, K>, OI>;

type GetObjectTypes<OI extends SfObjectsIndex> = { [K in keyof OI]: GetObjType<OI, K> }[keyof OI];
type GetSfObjectIndexKey<O, OI extends SfObjectsIndex> = { [N in keyof OI]: O extends GetObjType<OI, N> ? N : never }[keyof OI];



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

export interface SfWhereOp<OP extends SfValueOpKeys, V> { op: OP; value: V; }

export type ValOrDate<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = K extends GetObjDateTypes<OI, N> ? Temporal.PlainDate : K extends GetObjDateTimeTypes<OI, N> ? Temporal.ZonedDateTime : K extends GetObjTimeTypes<OI, N> ? Temporal.PlainTime : GetObjProp<OI, N, K>;

export type SfPrimitiveWhere<OI extends SfObjectsIndex, N extends keyof OI> = {
    [K in PrimitivePropKeys<OI, N>]+?: SingleOrArray<ValOrDate<OI, N, K>> | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, ValOrDate<OI, N, K>> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, ValOrDate<OI, N, K>[]> }[SfPluralOpKeys]
}

export type SfParentRelWhere<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in ParentRelPropKeys<OI, N>]+?: L extends 'overflow' ? never : SfWhere<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>
}

export type SfLogicalWhere<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in SfLogicalOpKeys]: L extends 'overflow' ? never : SfWhere<OI, N, IncrementDeepness<L>>;
}

export type SfWhere<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel = '0'> = SfPrimitiveWhere<OI, N> | SfParentRelWhere<OI, N, L> | SfLogicalWhere<OI, N, L>;

// select

export type SfSelectAndWhereParts<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = SfSelectStatement<SfSelection<OI, N, L>> & SfWhereStatement<SfWhere<OI, N, L>>;

export type SfChildRelSelection<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in ChildRelPropKeys<OI, N>]+?: L extends 'overflow' ? never : SfSelectAndWhereParts<OI, GetSfObjectChildPropIndexKey<OI, N, K>, IncrementDeepness<L>>
}

export type SParentRelSelection<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in ParentRelPropKeys<OI, N>]+?: L extends 'overflow' ? never : SfSelection<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>[]
}

export type SfSelection<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel = '0'> = SParentRelSelection<OI, N, L> | SfChildRelSelection<OI, N, L> | PrimitivePropKeys<OI, N>;

// Root Query

export type SfRootQuery<OI extends Record<string, SfObject>> = {
    [N in OnlyStrings<keyof OI>]: SfSelectStatement<SfSelection<OI, N>> & SfWhereStatement<SfWhere<OI, N>> & SfFromStatement<N> & SfLimitStatement
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

    select<N extends OnlyStrings<keyof OI>, S extends SfSelection<OI, N>>(from: N, pSelect: SingleOrArray<S>) {

        const select = pluralize(pSelect);

        return {
            select: <NS extends SfSelection<OI, N>>(nSelect: SingleOrArray<NS>) => this.select(from, [...select, ...pluralize(nSelect)]),
            //selectLookup: <S extends SParentRelSelection<GetObjType<OI, N>, OI>>(s: S) => '',
            where: <W extends SfWhere<OI, N>>(where: W) => this.query({ from, select, where }),
            ...this.query({ from, select })
        }
    };


    from<N extends OnlyStrings<keyof OI>>(from: N) {
        return {
            select: <S extends SfSelection<OI, N>>(select: SingleOrArray<S>) => this.select(from, select)
        }
    };

}

