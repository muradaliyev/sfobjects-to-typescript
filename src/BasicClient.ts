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

type ChildTablePropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends ChildTable ? GetObjNonNullProp<OI, N, K>['records'][0] extends GetObjectTypes<OI> ? K : never : never }[keyof GetObjType<OI, N>];
type ParentTablePropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends GetObjectTypes<OI> ? K : never }[keyof GetObjType<OI, N>];
type PrimitivePropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends SfPrimitiveType ? K : never }[keyof GetObjType<OI, N>];


type GetObjType<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['ObjectType'];
type GetObjDateTypes<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['DateTypes'];
type GetObjDateTimeTypes<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['DateTimeTypes'];
type GetObjTimeTypes<OI extends SfObjectsIndex, N extends keyof OI> = OI[N]['TimeTypes'];
type GetObjProp<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = GetObjType<OI, N>[K];
type GetObjNonNullProp<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = NonNullable<GetObjProp<OI, N, K>>;

type GetObjNonNullChildProp<OI extends SfObjectsIndex, N extends keyof OI, K extends keyof GetObjType<OI, N>> = GetChildProp<GetObjType<OI, N>, K>;

type GetSfObjectParentPropIndexKey<OI extends SfObjectsIndex, N extends keyof OI, K extends ParentTablePropKeys<OI, N>> = GetSfObjectIndexKey<GetObjNonNullProp<OI, N, K>, OI>;
type GetSfObjectChildPropIndexKey<OI extends SfObjectsIndex, N extends keyof OI, K extends ChildTablePropKeys<OI, N>> = GetSfObjectIndexKey<GetObjNonNullChildProp<OI, N, K>, OI>;

//GetSfObject<NonNullable<O[K]>['records'][0], OI>

type GetObjectTypes<OI extends SfObjectsIndex> = { [K in keyof OI]: GetObjType<OI, K> }[keyof OI];
type GetSfObject<O, OI extends SfObjectsIndex> = { [N in GetSfObjectIndexKey<O, OI>]: OI[N] }[GetSfObjectIndexKey<O, OI>];
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

export interface SfWhereOp<OP extends SfValueOpKeys, V> {
    op: OP;
    value: V;
}

export type SfPrimitiveWhereKeys<O> = { [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : never }[keyof O];

export type SfParentRelWhereKeys<O, OI extends SfObjectsIndex> = { [K in keyof O]: NonNullable<O[K]> extends GetObjectTypes<OI> ? K : never }[keyof O];

export type ValOrDate<K extends keyof GetObjType<OI, N>, N extends keyof OI, OI extends SfObjectsIndex> = K extends GetObjDateTypes<OI, N> ? Temporal.PlainDate : K extends GetObjDateTimeTypes<OI, N> ? Temporal.ZonedDateTime : K extends GetObjTimeTypes<OI, N> ? Temporal.PlainTime : GetObjProp<OI, N, K>;

export type SfPrimitiveWhere<N extends keyof OI, OI extends SfObjectsIndex> = {
    [K in SfPrimitiveWhereKeys<GetObjType<OI, N>>]+?: SingleOrArray<ValOrDate<K, N, OI>> | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, ValOrDate<K, N, OI>> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, ValOrDate<K, N, OI>[]> }[SfPluralOpKeys]
}

export type SfParentRelWhere<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel> = {
    [K in SfParentRelWhereKeys<GetObjType<OI, N>, OI>]+?: L extends 'overflow' ? never : SfWhere<GetSfObjectParentPropIndexKey<OI, N, K>, OI, IncrementDeepness<L>>
}

export type SfLogicalWhere<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel> = {
    [K in SfLogicalOpKeys]: L extends 'overflow' ? never : SfWhere<N, OI, IncrementDeepness<L>>;
}

export type SfWhere<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel = '0'> = SfPrimitiveWhere<N, OI> | SfParentRelWhere<N, OI, L> | SfLogicalWhere<N, OI, L>;

// select

export type SfSelectAndWhereParts<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel> = SfSelectStatement<SfSelection<N, OI, L>> & SfWhereStatement<SfWhere<N, OI, L>>;

// export type SfChildRelSelection<O, OI extends SfObjectsIndex> = {
//     [K in keyof O]: NonNullable<O[K]> extends ChildTable<GetObjectTypes<OI>> ? { [P in K]: SfSelectAndWhereParts<GetSfObject<NonNullable<O[K]>['records'][0], OI>, OI> /*| SfSelection<NonNullable<O[K]>['records'][0], OI>[]*/ } : never
// }[keyof O];

export type SfChildRelSelection<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel> = {
    [K in ChildTablePropKeys<OI, N>]+?: L extends 'overflow' ? never : SfSelectAndWhereParts<GetSfObjectChildPropIndexKey<OI, N, K>, OI, IncrementDeepness<L>>
}//[ChildTablePropKeys<OI, N>]



// export type SParentRelSelection<O, OI extends SfObjectsIndex> = {
//     [K in keyof O]: NonNullable<O[K]> extends GetObjectTypes<OI> ? { [P in K]: SfSelection<NonNullable<O[K]>, OI>[] } : never
// }[keyof O];

export type SParentRelSelection<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel> = {
    [K in ParentTablePropKeys<OI, N>]+?: L extends 'overflow' ? never : SfSelection<GetSfObjectParentPropIndexKey<OI, N, K>, OI, IncrementDeepness<L>>[]
}//[ParentTablePropKeys<OI, N>];


// export type SfPrimitiveSelection<O> = {
//     [K in keyof O]: NonNullable<O[K]> extends SfPrimitiveType ? K : never
// }[keyof O];

export type SfSelection<N extends keyof OI, OI extends SfObjectsIndex, L extends DeepnessLevel = '0'> = SParentRelSelection<N, OI, L> | SfChildRelSelection<N, OI, L> | PrimitivePropKeys<OI, N>;

// Root Query


//export type SfWhereFromIndex<OI extends Record<string, SfObject>, N extends OnlyStrings<keyof OI>> = SfWhere<N, OI>;

export type SfRootQuery<OI extends Record<string, SfObject>> = {
    [N in OnlyStrings<keyof OI>]: SfSelectStatement<SfSelection<N, OI>> & SfWhereStatement<SfWhere<N, OI>> & SfFromStatement<N> & SfLimitStatement
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

    select<N extends OnlyStrings<keyof OI>, S extends SfSelection<N, OI>>(from: N, pSelect: SingleOrArray<S>) {

        const select = pluralize(pSelect);

        return {
            select: <NS extends SfSelection<N, OI>>(nSelect: SingleOrArray<NS>) => this.select(from, [...select, ...pluralize(nSelect)]),
            //selectLookup: <S extends SParentRelSelection<GetObjType<OI, N>, OI>>(s: S) => '',
            where: <W extends SfWhere<N, OI>>(where: W) => this.query({ from, select, where }),
            ...this.query({ from, select })
        }
    };


    from<N extends OnlyStrings<keyof OI>>(from: N) {
        return {
            select: <S extends SfSelection<N, OI>>(select: SingleOrArray<S>) => this.select(from, select)
        }
    };

}

