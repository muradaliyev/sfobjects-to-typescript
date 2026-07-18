import { Temporal } from "@js-temporal/polyfill";
import { Connection } from "jsforce";
import { SingleOrArray, isPlainDate, isPlainObject, isPlainTime, isZonedDateTime, pluralize, uniq } from "./utils";
import { SfObjects } from "./interfaces";
import { frm_Grant__c } from "./interfaces/frm_Grant__c";
import { Account } from "./interfaces/Account";
import { frm_Allocation__c } from "./interfaces/frm_Allocation__c";
import { RecordType } from "./interfaces/RecordType";

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
export type PrimitivePropKeys<OI extends SfObjectsIndex, N extends keyof OI> = { [K in keyof GetObjType<OI, N>]: GetObjNonNullProp<OI, N, K> extends SfPrimitiveType ? K : never }[keyof GetObjType<OI, N>];


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

export type ValOrDate<OI extends SfObjectsIndex, N extends keyof OI, K extends PrimitivePropKeys<OI, N>/* keyof GetObjType<OI, N>*/> =
    K extends GetObjDateTypes<OI, N> ?
    Temporal.PlainDate : K extends GetObjDateTimeTypes<OI, N> ?
    Temporal.ZonedDateTime : K extends GetObjTimeTypes<OI, N> ?
    Temporal.PlainTime : GetObjProp<OI, N, K>;

export type SfPrimitiveWhere<OI extends SfObjectsIndex, N extends keyof OI> = {
    [K in PrimitivePropKeys<OI, N>]+?: SingleOrArray<ValOrDate<OI, N, K>> | { [OPK in SfSingularOpKeys]: SfWhereOp<OPK, ValOrDate<OI, N, K>> }[SfSingularOpKeys] | { [OPK in SfPluralOpKeys]: SfWhereOp<OPK, ValOrDate<OI, N, K>[]> }[SfPluralOpKeys]
};

export type SfParentRelWhere<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in ParentRelPropKeys<OI, N>]+?: L extends 'overflow' ? never : SfWhere<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>
};

export type SfLogicalWhere<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in SfLogicalOpKeys]: L extends 'overflow' ? never : SfWhere<OI, N, IncrementDeepness<L>>;
}

export type SfWhere<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel = '0'> =
    SfPrimitiveWhere<OI, N> |
    SfParentRelWhere<OI, N, L> |
    SfLogicalWhere<OI, N, L>;



// select

//type SfSelectAndWhereParts<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = SfSelectStatement<SfSelection<OI, N, L>> & SfWhereStatement<SfWhere<OI, N, L>>;


type SfParentSelectStatement<K, S = any> = { type: 'A', fromLookup: K, select: S[] };

type SfChildSelectStatement<K, S = any, W = any> = { type: 'B', fromChild: K, select: S[], where?: W };

type SfParentRelSelection<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in ParentRelPropKeys<OI, N>]: L extends 'overflow' ? never : SfParentSelectStatement<K, SfSelection<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>>
}[ParentRelPropKeys<OI, N>];


type SfChildRelSelection<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel> = {
    [K in ChildRelPropKeys<OI, N>]: L extends 'overflow' ? never : SfChildSelectStatement<K, SfSelection<OI, GetSfObjectChildPropIndexKey<OI, N, K>, IncrementDeepness<L>>, SfWhere<OI, GetSfObjectChildPropIndexKey<OI, N, K>, IncrementDeepness<L>>>
}[ChildRelPropKeys<OI, N>];


export type SfSelection<OI extends SfObjectsIndex, N extends keyof OI, L extends DeepnessLevel = '0'> = SfParentRelSelection<OI, N, L> | SfChildRelSelection<OI, N, L> | PrimitivePropKeys<OI, N>;

// Root Query

export type SfRootQuery<OI extends SfObjectsIndex> = {
    [N in OnlyStrings<keyof OI>]: SfSelectStatement<SfSelection<OI, N>> & SfWhereStatement<SfWhere<OI, N>> & SfFromStatement<N> & SfLimitStatement
}[OnlyStrings<keyof OI>]


// projection

type SfPrjPrimitiveKeys<O, S> = { [K in keyof O]: S extends K ? K : never }[keyof O];
type SfPrjParentKeys<O, S> = { [K in keyof O]: S extends SfParentSelectStatement<K> ? K : never }[keyof O];
type SfPrjChildKeys<O, S> = { [K in keyof O]: S extends SfChildSelectStatement<K> ? K : never }[keyof O];
type WrapParent<T, S> = T extends null ? null : SfSelectProjection<T, S>;
type WrapChild<T, S> = T extends null ? null : T extends ChildTable ? ChildTable<SfSelectProjection<T['records'][0], S>> : never;
type SfPrimitiveSelectProjection<O, S> = { [OK in SfPrjPrimitiveKeys<O, S>]: O[OK] };
type SfParentRelSelectProjection<O, S> = { [OK in SfPrjParentKeys<O, S>]: S extends SfParentSelectStatement<OK> ? WrapParent<O[OK], S['select'][0]> : never };
type SfChildRelSelectProjection<O, S> = { [OK in SfPrjChildKeys<O, S>]: S extends SfChildSelectStatement<OK> ? WrapChild<O[OK], S['select'][0]> : never };
type SfSelectProjection<O, S> = SfPrimitiveSelectProjection<O, OnlyStrings<S>> & SfParentRelSelectProjection<O, OnlyObjects<S>> & SfChildRelSelectProjection<O, OnlyObjects<S>>;

export type SfQueryProjection<OI extends SfObjectsIndex, Q extends SfRootQuery<OI>> = SfSelectProjection<GetObjType<OI, Q['from']>, Q['select'][0]>;


function escapeVal(v: any): string {


    if (typeof v === 'string') {
        return `'${v}'`;
    }

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

                const keyWithPrefix = [...(prefixes || []), k].join('.');

                if (isPlainObject(v)) {

                    const { op, value, ...rest } = v;

                    if (op !== undefined && value !== undefined) {

                        const opRule = OP_RULES.find(r => r.ops.some(rop => (rop === op)));

                        if (opRule) {

                            const { soqlOp, isNot, isPlural } = opRule;

                            if ((isPlural ?? false) === Array.isArray(value)) {


                                return [
                                    isNot ? 'not (' : '',
                                    keyWithPrefix,
                                    soqlOp,
                                    Array.isArray(value) ? `(${value.map(escapeVal).join(',')})` : escapeVal(value),
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
                    return `${keyWithPrefix} in (${v.map(escapeVal).join(',')})`;
                }
                else {
                    return `${keyWithPrefix} = ${escapeVal(v)}`;
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

function isParentStatement(rst: Record<string, any>): rst is SfParentSelectStatement<string> {
    return !!rst['fromLookup']
}

function isChildStatement(rst: Record<string, any>): rst is SfChildSelectStatement<string> {
    return !!rst['fromChild']
}

function constructSelectStatement(select: (string | {})[], prefixes: string[] = []): string {

    return [
        ...uniq(select.filter(st => (typeof st === 'string'))).map(st => [...prefixes, st].join('.')),
        ...select
            .filter(st => isPlainObject(st))

            .map((rst) => {

                if (isChildStatement(rst)) {
                    const { fromChild, select, where } = rst;
                    return `(${constructFullQuery(fromChild, select, where)})`;
                }

                if (isParentStatement(rst)) {
                    const { fromLookup, select } = rst;
                    return constructSelectStatement(select, [...prefixes, fromLookup])
                }

                // throw error???
            })
    ]
        .filter(Boolean)
        .join(', ');

}

export class BasicClient<OI extends SfObjectsIndex> {


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

    selectLookup<N extends OnlyStrings<keyof OI>, K extends ParentRelPropKeys<OI, N>, NS extends SfSelection<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>, L extends DeepnessLevel>(fromLookup: K, select: NS[]) {
        return { fromLookup, select };
    }

    from<N extends OnlyStrings<keyof OI>, S extends SfSelection<OI, N, L>, L extends DeepnessLevel = '0'>(from: N, select: S[] = []) {

        return {
            select: <NS extends SfSelection<OI, N, L>>(nSelect: NS[]) => this.from(from, [...select, ...nSelect]),
            //selectLookup: <K extends ParentRelPropKeys<OI, N>, NS extends SfSelection<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>>(fromLookup: K, nSelect: NS[]) => this.from(from, [...select, this.selectLookup(fromLookup, nSelect)]),
            where: <W extends SfWhere<OI, N>>(where: W) => this.query({ from, select, where }),
            ...this.query({ from, select }),
        }
    };

    // fromLookup<N extends OnlyStrings<keyof OI>, K extends ParentRelPropKeys<OI, N>, S extends SfSelection<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>, L extends DeepnessLevel>(fromLookup: K, select: S[] = []) {
    //     return {
    //         select: <NS extends S>(nSelect: NS[]) => this.fromLookup(fromLookup, [...select, ...nSelect]),
    //         result: <NQ extends SfParentSelectStatement<K, S>>(): NQ => ({ fromLookup, select } as NQ)
    //     }
    // }
}

interface FromLookup<OI extends SfObjectsIndex, N extends OnlyStrings<keyof OI>, K extends ParentRelPropKeys<OI, N>, S extends SfSelection<OI, GetSfObjectParentPropIndexKey<OI, N, K>, IncrementDeepness<L>>, L extends DeepnessLevel> {
    select: <NS extends S, NI extends FromLookup<OI, N, K, S | NS, L>>(nSelect: NS[]) => NI,
    result: <NQ extends SfParentSelectStatement<K, S>>() => NQ
}

// function fromName<OI extends SfObjectsIndex, N extends OnlyStrings<keyof OI>, S extends SfSelection<OI, N, L>, L extends DeepnessLevel = '0'>(from: N, pSelect: S[]) {
//     return {
//         select: <NS extends SfSelection<OI, N, L>>(nSelect: NS[]) => fromName<OI, N, NS, L>(from, [...pSelect, ...nSelect])
//     }
// }





type PropSelect<OO, O> = {
    [K in keyof O]:
    NonNullable<O[K]> extends SfPrimitiveType ? K :
    NonNullable<O[K]> extends ChildTable<OO> ? { from: K, select: PropSelect<OO, NonNullable<O[K]>['records'][0]>[] } :
    NonNullable<O[K]> extends OO ? { from: K, select: PropSelect<OO, NonNullable<O[K]>>[] } :
    never
}[keyof O]

//type TestNav<OI extends SfObjectsIndex, O> = { select: (TestNavParent<OI, O> | TestNavChild<OI, O>)[] };
type RootSelect<OI extends SfObjectsIndex> = { [N in keyof OI]: { from: N, select: PropSelect<GetObjectTypes<OI>, GetObjType<OI, N>>[] } }[keyof OI];





// type SfPrjPrimitiveKeys<O, S> = { [K in keyof O]: S extends K ? K : never }[keyof O];
// type SfPrjParentKeys<O, S> = { [K in keyof O]: S extends SfParentSelectStatement<K> ? K : never }[keyof O];
// type SfPrjChildKeys<O, S> = { [K in keyof O]: S extends SfChildSelectStatement<K> ? K : never }[keyof O];
// type WrapParent<T, S> = T extends null ? null : SfSelectProjection<T, S>;
// type WrapChild<T, S> = T extends null ? null : T extends ChildTable ? ChildTable<SfSelectProjection<T['records'][0], S>> : never;
// type SfPrimitiveSelectProjection<O, S> = { [OK in SfPrjPrimitiveKeys<O, S>]: O[OK] };
// type SfParentRelSelectProjection<O, S> = { [OK in SfPrjParentKeys<O, S>]: S extends SfParentSelectStatement<OK> ? WrapParent<O[OK], S['select'][0]> : never };
// type SfChildRelSelectProjection<O, S> = { [OK in SfPrjChildKeys<O, S>]: S extends SfChildSelectStatement<OK> ? WrapChild<O[OK], S['select'][0]> : never };
// type SfSelectProjection<O, S> = SfPrimitiveSelectProjection<O, OnlyStrings<S>> & SfParentRelSelectProjection<O, OnlyObjects<S>> & SfChildRelSelectProjection<O, OnlyObjects<S>>;

// export type SfQueryProjection<OI extends SfObjectsIndex, Q extends SfRootQuery<OI>> = SfSelectProjection<GetObjType<OI, Q['from']>, Q['select'][0]>;

type SelectProjKeys<S, O> = { [K in keyof O]: K extends S ? K : S extends { from: K } ? K : never }[keyof O]


type SelectProj<S, O, OO> = {
    [K in SelectProjKeys<S, O>]: WrapNull<O[K]> | (
        S extends K ? O[K] : (
            S extends { from: K, select: any[] } ? (
                NonNullable<O[K]> extends OO ? SelectProj<S['select'][0], NonNullable<O[K]>, OO> :
                NonNullable<O[K]> extends ChildTable<OO> ? ChildTable<SelectProj<S['select'][0], NonNullable<O[K]>['records'][0], OO>> :
                never
            ) : never
        )
    )
}

type WrapNull<T> = T extends null ? null : never;

type eee = WrapNull<frm_Grant__c['Mother_Grant__r']>

type SelectRootProj<OI extends SfObjectsIndex, Q extends RootSelect<OI>> = SelectProj<Q['select'][0], GetObjType<OI, Q['from']>, GetObjectTypes<OI>>


type SelectRootTest<OI extends SfObjectsIndex, Q extends RootSelect<OI>> = SelectProjKeys<Q['select'][0], GetObjType<OI, Q['from']>> //GetObjType<OI, Q['from']>;//Q['select'][0];



class TestClass<OI extends {}> {
    testFunc<Q extends RootSelect<OI>>(q: Q) {
        return q as any as SelectRootProj<OI, Q>;
    }
}



const testCl = new TestClass<SfObjects>();

const tt = testCl.testFunc({
    from: 'frm_Grant__c',
    select: [
        'Id',
        'Active__c',
        'Stage__c',
        {
            'from': 'Account_Donor_Name__r',
            select: [
                'AccountNumber',
                'AccountSource'
            ]
        },
        {
            from: 'Allocations__r',
            select: [
                'Amendment__c'
            ]
        },
        {
            from: 'Mother_Grant__r',
            select: [
                'Active__c'
            ]
        }
    ]
})




//OI extends SfObjectsIndex, N extends keyof OI